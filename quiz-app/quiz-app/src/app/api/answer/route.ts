import { NextRequest, NextResponse } from 'next/server';
import { kvStorage } from '@/lib/kvStorage';
import { correctAnswers } from '@/lib/mockStorage';

// Node.js Runtimeを強制してメモリ共有を有効に
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Note: Timer data now stored in KV storage for proper persistence and reset handling

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Answer submitted:', body);
    
    // Support both old and new parameter formats for compatibility
    const answerValue = body.answerValue !== undefined ? body.answerValue : body.answerId;
    
    // Validate request
    if (!body.eventId || !body.playerId || !body.questionId || answerValue === undefined) {
      return NextResponse.json(
        { success: false, error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    const { eventId, playerId, questionId } = body;
    const answerKey = `${eventId}-${questionId}`;
    const currentTime = Date.now();

    // Check if question has started and get start time from game state
    let questionStartTime = currentTime - 5000; // Default fallback
    
    try {
      const gameState = await kvStorage.getGameState(eventId);
      if (gameState?.questionStartTime) {
        questionStartTime = gameState.questionStartTime;
      }
    } catch (error) {
      console.error('Failed to get game state:', error);
    }

    // Calculate time limit (60 seconds for now, extensions can be added later)
    const baseTimeLimit = 60 * 1000; // 60 seconds in milliseconds
    const totalTimeLimit = baseTimeLimit;
    
    // Check if answer is within time limit
    const elapsedTime = currentTime - questionStartTime;
    if (elapsedTime > totalTimeLimit) {
      return NextResponse.json({
        success: false,
        accepted: false,
        error: '回答時間が終了しました。回答は自動的に0として記録されます。',
        timeUp: true
      });
    }

    // Get existing answers for this question
    const existingAnswers = await kvStorage.getAnswers(answerKey);
    
    // Check if player already answered
    const existingAnswer = existingAnswers.find(a => a.playerId === playerId);
    if (existingAnswer) {
      return NextResponse.json({
        success: false,
        accepted: false,
        error: 'すでに回答済みです'
      });
    }

    // Check if player is eliminated
    const participants = await kvStorage.getParticipants(eventId);
    const participant = participants.find(p => p.playerId === playerId);
    if (participant && participant.status === 'eliminated') {
      return NextResponse.json({
        success: false,
        accepted: false,
        error: 'ELIMINATEDユーザーは回答できません'
      });
    }

    // Get question range (default 0-100 if not specified)
    const minValue = body.minValue || 0;
    const maxValue = body.maxValue || 100;
    
    // Validate answer range
    if (answerValue < minValue || answerValue > maxValue) {
      return NextResponse.json({
        success: false,
        accepted: false,
        error: `回答は${minValue}から${maxValue}の範囲で入力してください`
      });
    }

    // Calculate damage based on difference from correct answer
    const correctAnswer = correctAnswers[questionId] || 0;
    const difference = Math.abs(answerValue - correctAnswer);
    const damage = Math.min(100, difference); // Maximum 100 damage

    // Store the answer temporarily
    const answerData = {
      playerId,
      answerValue,
      answerTime: elapsedTime,
      correctAnswer,
      difference,
      damage,
      submittedAt: currentTime,
      isLastAnswerer: false // Will be determined later
    };

    // Add new answer to existing answers and save
    const updatedAnswers = [...existingAnswers, answerData];
    await kvStorage.setAnswers(answerKey, updatedAnswers);

    console.log(`Answer stored for ${answerKey}:`, answerData);
    console.log(`Total answers for ${answerKey}:`, updatedAnswers.length);

    // Check if all participants have answered to apply last answerer penalty
    const allAnswered = updatedAnswers.length >= participants.length;
    
    if (allAnswered) {
      // Apply last answerer penalty immediately when all have answered
      await applyLastAnswererPenalty(eventId, questionId);
    }

    const response = {
      success: true,
      accepted: true,
      yourAnswer: answerValue,
      timeRemaining: Math.max(0, totalTimeLimit - elapsedTime),
      message: '回答を送信しました！結果発表をお待ちください。'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Answer API error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// Handle automatic timeout answers
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, questionId } = body;
    
    const answerKey = `${eventId}-${questionId}`;
    
    // Get existing answers and participants
    const existingAnswers = await kvStorage.getAnswers(answerKey);
    const allParticipants = await kvStorage.getParticipants(eventId);
    
    // Get all participants who haven't answered
    const answeredPlayers = existingAnswers.map(a => a.playerId);
    const unansweredPlayers = allParticipants.filter(p => !answeredPlayers.includes(p.playerId));

    // Add timeout answers (value: 0) for unanswered players
    const correctAnswer = correctAnswers[questionId] || 0;
    const currentTime = Date.now();
    
    const timeoutAnswers = [];
    for (const player of unansweredPlayers) {
      const damage = Math.abs(0 - correctAnswer); // Damage from answering 0
      
      timeoutAnswers.push({
        playerId: player.playerId,
        answerValue: 0,
        answerTime: 60000, // Max time
        correctAnswer,
        difference: Math.abs(0 - correctAnswer),
        damage,
        submittedAt: currentTime,
        isTimeout: true,
        isLastAnswerer: false
      });
    }
    
    // Save all answers (existing + timeout answers)
    const allAnswers = [...existingAnswers, ...timeoutAnswers];
    await kvStorage.setAnswers(answerKey, allAnswers);

    // Apply last answerer penalty for all answers (including timeouts)
    await applyLastAnswererPenalty(eventId, questionId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Timeout API error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// Timer functions temporarily removed to avoid Next.js Route export conflicts
// TODO: Move to separate utility file if needed

// Function to apply last answerer penalty
async function applyLastAnswererPenalty(eventId: string, questionId: string) {
  const answerKey = `${eventId}-${questionId}`;
  const answers = await kvStorage.getAnswers(answerKey);
  
  if (answers.length === 0) return;
  
  // Get participants to check elimination status
  const participants = await kvStorage.getParticipants(eventId);
  
  // Filter out answers from eliminated players before determining last answerer
  const activeAnswers = answers.filter(answer => {
    const participant = participants.find(p => p.playerId === answer.playerId);
    return participant && participant.status !== 'eliminated';
  });
  
  if (activeAnswers.length === 0) return;
  
  // Sort active answers by submission time to find last answerer(s)
  const sortedActiveAnswers = [...activeAnswers].sort((a, b) => (b.submittedAt as number) - (a.submittedAt as number));
  const latestTime = sortedActiveAnswers[0].submittedAt;
  
  // Mark all active answers with latest timestamp as last answerer and apply double damage
  let updatedAnswers = false;
  answers.forEach(answer => {
    const participant = participants.find(p => p.playerId === answer.playerId);
    const isActive = participant && participant.status !== 'eliminated';
    
    if (isActive && answer.submittedAt === latestTime && !answer.isTimeout) {
      answer.isLastAnswerer = true;
      answer.damage = answer.damage * 2; // Double damage for last answerers
      console.log(`Applied last answerer penalty to active player ${answer.playerId}: ${answer.damage} damage`);
      updatedAnswers = true;
    }
  });
  
  if (updatedAnswers) {
    await kvStorage.setAnswers(answerKey, answers);
  }
  
  console.log(`Applied last answerer penalty for ${answerKey} (excluded eliminated players)`);
}

// GET endpoint to retrieve answer statistics and real-time info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('e');
    const questionId = searchParams.get('q');

    if (!eventId || !questionId) {
      return NextResponse.json(
        { error: 'イベントIDと問題IDが必要です' },
        { status: 400 }
      );
    }

    const answerKey = `${eventId}-${questionId}`;
    const answers = await kvStorage.getAnswers(answerKey);
    const allParticipants = await kvStorage.getParticipants(eventId);
    const currentTime = Date.now();

    // Calculate time remaining from game state
    let timeRemaining = 0;
    let questionStartTime = 0;
    
    try {
      const gameState = await kvStorage.getGameState(eventId);
      if (gameState?.questionStartTime) {
        questionStartTime = gameState.questionStartTime;
        const baseTimeLimit = 60 * 1000; // 60 seconds
        const elapsedTime = currentTime - questionStartTime;
        timeRemaining = Math.max(0, baseTimeLimit - elapsedTime);
      }
    } catch (error) {
      console.error('Failed to get game state for timer:', error);
    }
    const totalParticipants = allParticipants.length;

    // Calculate battle quiz statistics
    const stats = {
      totalAnswers: answers.length,
      totalParticipants,
      correctAnswer: correctAnswers[questionId] || 0,
      averageAnswer: answers.length > 0 ? Math.round(answers.reduce((sum, a) => sum + (a.answerValue || 0), 0) / answers.length) : 0,
      averageDamage: answers.length > 0 ? Math.round(answers.reduce((sum, a) => sum + (a.damage || 0), 0) / answers.length) : 0,
      timeRemaining,
      questionStartTime,
      extensionCount: 0, // Extensions disabled for now, can be re-implemented later
      answers: answers.map(a => ({
        playerId: a.playerId,
        answerValue: a.answerValue,
        damage: a.damage,
        difference: a.difference,
        isLastAnswerer: a.isLastAnswerer || false,
        isTimeout: a.isTimeout || false
      }))
    };

    console.log(`GET answers for ${answerKey}: found ${answers.length}/${totalParticipants} answers`);
    console.log('Stats being returned:', stats);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Answer stats API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}