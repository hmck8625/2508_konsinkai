import { NextRequest, NextResponse } from 'next/server';
import { mockStorage, mockQuestions } from '@/lib/mockStorage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('e');

    if (!eventId) {
      return NextResponse.json(
        { error: 'イベントIDが必要です' },
        { status: 400 }
      );
    }

    // Initialize game state for this event if it doesn't exist
    if (!mockStorage.gameStates[eventId]) {
      mockStorage.gameStates[eventId] = {
        status: 'lobby',
        currentQuestionIndex: 0,
        currentQuestion: null,
        questionStartTime: null,
        questions: mockQuestions,
        serverTime: Date.now(),
        leaderboard: [],
        questionStats: {
          totalAnswers: 0,
        },
      };
    }

    const gameState = mockStorage.gameStates[eventId] as Record<string, unknown>;
    
    // Ensure questions array is available
    if (!(gameState.questions as unknown[]) || (gameState.questions as unknown[]).length === 0) {
      gameState.questions = mockQuestions;
    }
    
    // Set current question based on index (no automatic progression)
    if (gameState.status === 'active' && (gameState.currentQuestionIndex as number) < (gameState.questions as unknown[]).length) {
      const mockQuestion = (gameState.questions as Record<string, unknown>[])[gameState.currentQuestionIndex as number];
      gameState.currentQuestion = {
        id: mockQuestion.id,
        title: mockQuestion.title,
        choices: ['', '', '', ''], // Not used for numerical questions
        answerIndex: 0, // Not used for numerical questions
        timeLimitSec: 60,
        minValue: 0,
        maxValue: mockQuestion.maxValue || 100,
        correctAnswer: mockQuestion.correctAnswer
      };
    }
    
    // Update server time
    gameState.serverTime = Date.now();

    return NextResponse.json(gameState);
  } catch (error) {
    console.error('State API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, action } = body;

    if (!eventId || !action) {
      return NextResponse.json(
        { error: 'イベントIDとアクションが必要です' },
        { status: 400 }
      );
    }

    // Initialize game state if it doesn't exist
    if (!mockStorage.gameStates[eventId]) {
      mockStorage.gameStates[eventId] = {
        status: 'lobby',
        currentQuestionIndex: 0,
        currentQuestion: null,
        questionStartTime: null,
        questions: mockQuestions,
        serverTime: Date.now(),
        leaderboard: [],
        questionStats: {
          totalAnswers: 0,
        },
      };
    }

    const gameState = mockStorage.gameStates[eventId] as Record<string, unknown>;

    switch (action) {
      case 'startGame':
        gameState.status = 'active';
        gameState.currentQuestionIndex = 0;
        gameState.questionStartTime = Date.now();
        break;

      case 'nextQuestion':
        if ((gameState.currentQuestionIndex as number) < (gameState.questions as unknown[]).length - 1) {
          gameState.currentQuestionIndex = (gameState.currentQuestionIndex as number) + 1;
          gameState.questionStartTime = Date.now();
        }
        break;

      case 'endGame':
        gameState.status = 'ended';
        break;

      case 'resetGame':
        gameState.status = 'lobby';
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null;
        gameState.questionStartTime = null;
        // Clear all participants for complete reset
        if (mockStorage.participants[eventId]) {
          delete mockStorage.participants[eventId];
        }
        // Clear all answers
        Object.keys(mockStorage.answers).forEach(key => {
          if (key.startsWith(`${eventId}-`)) {
            delete mockStorage.answers[key];
          }
        });
        console.log(`Game reset: cleared all participants and answers for event ${eventId}`);
        break;

      default:
        return NextResponse.json(
          { error: '無効なアクションです' },
          { status: 400 }
        );
    }

    gameState.serverTime = Date.now();

    return NextResponse.json({
      success: true,
      gameState
    });

  } catch (error) {
    console.error('State POST API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}