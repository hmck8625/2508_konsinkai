import { NextRequest, NextResponse } from 'next/server';
import { mockStorage, correctAnswers } from '@/lib/mockStorage';

// Question start times storage (simulating database)
const questionStartTimes: { [key: string]: number } = {};
const questionExtensions: { [key: string]: number } = {};

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

    // Check if question has started and get start time
    const questionStartKey = `${eventId}-${questionId}-start`;
    if (!questionStartTimes[questionStartKey]) {
      // Set question start time to 5 seconds ago to allow some startup time
      questionStartTimes[questionStartKey] = currentTime - 5000;
      console.log(`Setting question start time for ${questionStartKey}: ${new Date(questionStartTimes[questionStartKey]).toISOString()}`);
    }

    // Calculate time limit (60 seconds + extensions)
    const baseTimeLimit = 60 * 1000; // 60 seconds in milliseconds
    const extensions = questionExtensions[questionStartKey] || 0;
    const totalTimeLimit = baseTimeLimit + extensions;
    
    // Check if answer is within time limit
    const elapsedTime = currentTime - questionStartTimes[questionStartKey];
    if (elapsedTime > totalTimeLimit) {
      return NextResponse.json({
        success: false,
        accepted: false,
        error: '回答時間が終了しました。回答は自動的に0として記録されます。',
        timeUp: true
      });
    }

    // Initialize answers array for this question if it doesn't exist
    if (!mockStorage.answers[answerKey]) {
      mockStorage.answers[answerKey] = [];
    }

    // Check if player already answered
    const existingAnswer = mockStorage.answers[answerKey].find((a) => (a as Record<string, unknown>).playerId === playerId);
    if (existingAnswer) {
      return NextResponse.json({
        success: false,
        accepted: false,
        error: 'すでに回答済みです'
      });
    }

    // Check if player is eliminated
    if (mockStorage.participants[eventId]) {
      const participant = mockStorage.participants[eventId].find(p => (p as Record<string, unknown>).playerId === playerId);
      if (participant && (participant as Record<string, unknown>).status === 'eliminated') {
        return NextResponse.json({
          success: false,
          accepted: false,
          error: 'ELIMINATEDユーザーは回答できません'
        });
      }
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

    // Add new answer
    mockStorage.answers[answerKey].push(answerData);

    console.log(`Answer stored for ${answerKey}:`, answerData);
    console.log(`Total answers for ${answerKey}:`, mockStorage.answers[answerKey].length);

    // Check if all participants have answered to apply last answerer penalty
    const allParticipants = mockStorage.participants[eventId] || [];
    const allAnswered = mockStorage.answers[answerKey].length >= allParticipants.length;
    
    if (allAnswered) {
      // Apply last answerer penalty immediately when all have answered
      applyLastAnswererPenalty(eventId, questionId);
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
    
    if (!mockStorage.answers[answerKey]) {
      mockStorage.answers[answerKey] = [];
    }

    // Get all participants who haven't answered
    const answeredPlayers = mockStorage.answers[answerKey].map(a => (a as Record<string, unknown>).playerId);
    const allParticipants = mockStorage.participants[eventId] || [];
    const unansweredPlayers = allParticipants.filter(p => !answeredPlayers.includes((p as Record<string, unknown>).playerId));

    // Add timeout answers (value: 0) for unanswered players
    const correctAnswer = correctAnswers[questionId] || 0;
    const currentTime = Date.now();
    
    for (const player of unansweredPlayers) {
      const damage = Math.abs(0 - correctAnswer); // Damage from answering 0
      
      mockStorage.answers[answerKey].push({
        playerId: (player as Record<string, unknown>).playerId,
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

    // Apply last answerer penalty for all answers (including timeouts)
    applyLastAnswererPenalty(eventId, questionId);

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
function applyLastAnswererPenalty(eventId: string, questionId: string) {
  const answerKey = `${eventId}-${questionId}`;
  const answers = (mockStorage.answers[answerKey] || []) as Record<string, unknown>[];
  
  if (answers.length === 0) return;
  
  // Get participants to check elimination status
  const participants = mockStorage.participants[eventId] || [];
  
  // Filter out answers from eliminated players before determining last answerer
  const activeAnswers = answers.filter(answer => {
    const participant = participants.find(p => (p as Record<string, unknown>).playerId === answer.playerId);
    return participant && (participant as Record<string, unknown>).status !== 'eliminated';
  });
  
  if (activeAnswers.length === 0) return;
  
  // Sort active answers by submission time to find last answerer(s)
  const sortedActiveAnswers = [...activeAnswers].sort((a, b) => (b.submittedAt as number) - (a.submittedAt as number));
  const latestTime = sortedActiveAnswers[0].submittedAt;
  
  // Mark all active answers with latest timestamp as last answerer and apply double damage
  answers.forEach(answer => {
    const participant = participants.find(p => (p as Record<string, unknown>).playerId === answer.playerId);
    const isActive = participant && (participant as Record<string, unknown>).status !== 'eliminated';
    
    if (isActive && answer.submittedAt === latestTime && !answer.isTimeout) {
      answer.isLastAnswerer = true;
      answer.damage = (answer.damage as number) * 2; // Double damage for last answerers
      console.log(`Applied last answerer penalty to active player ${answer.playerId}: ${answer.damage} damage`);
    }
  });
  
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
    const questionStartKey = `${eventId}-${questionId}-start`;
    const answers = (mockStorage.answers[answerKey] || []) as Record<string, unknown>[];
    const currentTime = Date.now();

    // Calculate time remaining
    let timeRemaining = 0;
    let questionStartTime = 0;
    
    if (questionStartTimes[questionStartKey]) {
      questionStartTime = questionStartTimes[questionStartKey];
      const baseTimeLimit = 60 * 1000; // 60 seconds
      const extensions = questionExtensions[questionStartKey] || 0;
      const totalTimeLimit = baseTimeLimit + extensions;
      const elapsedTime = currentTime - questionStartTime;
      timeRemaining = Math.max(0, totalTimeLimit - elapsedTime);
    }

    // Get total participants count
    const allParticipants = mockStorage.participants[eventId] || [];
    const totalParticipants = allParticipants.length;

    // Calculate battle quiz statistics
    const stats = {
      totalAnswers: answers.length,
      totalParticipants,
      correctAnswer: correctAnswers[questionId] || 0,
      averageAnswer: answers.length > 0 ? Math.round(answers.reduce((sum, a) => sum + (Number(a.answerValue) || 0), 0) / answers.length) : 0,
      averageDamage: answers.length > 0 ? Math.round(answers.reduce((sum, a) => sum + (Number(a.damage) || 0), 0) / answers.length) : 0,
      timeRemaining,
      questionStartTime,
      extensionCount: questionExtensions[questionStartKey] ? Math.floor(questionExtensions[questionStartKey] / 1000) : 0,
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