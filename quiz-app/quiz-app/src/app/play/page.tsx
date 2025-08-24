'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function PlayPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  const [answerValue, setAnswerValue] = useState<string>('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<Record<string, unknown> | null>(null);
  const [playerStatus, setPlayerStatus] = useState<string>('active');
  const [playerLife, setPlayerLife] = useState<number>(100);

  // Initialize player data from localStorage
  useEffect(() => {
    const storedPlayerId = localStorage.getItem('quiz-player-id');
    const storedEventId = localStorage.getItem('quiz-event-id');
    const storedNickname = localStorage.getItem('quiz-player-nickname');

    if (!storedPlayerId || !storedEventId || !storedNickname) {
      router.push('/join');
      return;
    }

    setPlayerId(storedPlayerId);
    setEventId(storedEventId);
    setNickname(storedNickname);
  }, [router]);

  const handleTimeUpSubmit = useCallback(async () => {
    if (!currentQuestion || !playerId || !eventId || hasAnswered) return;

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          playerId,
          questionId: (currentQuestion as Record<string, unknown>).id,
          answerValue: 0,
          answerTime: 60000, // Max time
          minValue: Number((currentQuestion as Record<string, unknown>).minValue) || 0,
          maxValue: Number((currentQuestion as Record<string, unknown>).maxValue) || 100,
        }),
      });

      if (response.ok) {
        await response.json();
        setHasAnswered(true);
        setLastResult({
          yourAnswer: 0,
          message: '時間切れのため、自動的に0で回答されました'
        });
      }
    } catch (error) {
      console.error('Failed to submit timeout answer:', error);
    }
  }, [currentQuestion, playerId, eventId, hasAnswered]);

  // Poll game state and answer stats for timer
  useEffect(() => {
    if (!eventId) return;

    const pollGameState = async () => {
      try {
        // Fetch game state
        const response = await fetch(`/api/state?e=${eventId}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`🎯 PLAY DEBUG Game state for ${eventId}:`, data.status, data.currentQuestion ? `question: ${data.currentQuestion.id}` : 'no question');
          setGameState(data);

          // Fetch current player status
          if (playerId) {
            try {
              const participantsResponse = await fetch(`/api/participants?e=${eventId}`);
              if (participantsResponse.ok) {
                const participantsData = await participantsResponse.json();
                const currentPlayer = participantsData.participants.find((p: any) => p.playerId === playerId);
                if (currentPlayer) {
                  setPlayerStatus(currentPlayer.status || 'active');
                  setPlayerLife(currentPlayer.life !== undefined ? currentPlayer.life : 100);
                  console.log('Player status:', currentPlayer.status, 'Life:', currentPlayer.life);
                }
              }
            } catch (error) {
              console.error('Failed to fetch participant status:', error);
            }
          }
          
          // Reset answer state when question changes
          if ((data as Record<string, unknown>).currentQuestion && (data as Record<string, unknown>).currentQuestion !== (gameState as Record<string, unknown>)?.currentQuestion) {
            console.log('Question changed, resetting answer state:', ((data as Record<string, unknown>).currentQuestion as Record<string, unknown>).id);
            setAnswerValue('');
            setHasAnswered(false);
            setLastResult(null);
            setIsTimeUp(false);
            setCurrentQuestion((data as Record<string, unknown>).currentQuestion as Record<string, unknown>);
          }

          // Get real-time timer info if there's an active question
          if ((data as Record<string, unknown>).currentQuestion && (data as Record<string, unknown>).status === 'active') {
            try {
              const answerResponse = await fetch(`/api/answer?e=${eventId}&q=${((data as Record<string, unknown>).currentQuestion as Record<string, unknown>).id}`);
              if (answerResponse.ok) {
                const answerData = await answerResponse.json();
                const remaining = Math.ceil(answerData.timeRemaining / 1000);
                setTimeRemaining(Math.max(0, remaining));
                
                // Check if this player has already answered this question
                if ((answerData as Record<string, unknown>).answers && playerId) {
                  const playerAnswer = ((answerData as Record<string, unknown>).answers as Record<string, unknown>[]).find((a: Record<string, unknown>) => a.playerId === playerId);
                  if (playerAnswer && !hasAnswered) {
                    console.log('Player has already answered this question:', playerAnswer);
                    setHasAnswered(true);
                    setLastResult({
                      yourAnswer: playerAnswer.answerValue,
                      message: '回答済みです'
                    });
                  }
                }
                
                if (remaining <= 0 && !hasAnswered && !isTimeUp) {
                  setIsTimeUp(true);
                  // Auto-submit as 0 if time is up
                  handleTimeUpSubmit();
                }
              } else {
                // If answer API fails, default to 60 seconds countdown from question start
                const elapsed = Math.floor((Date.now() - (Number((data as Record<string, unknown>).questionStartTime) || Date.now())) / 1000);
                const remaining = Math.max(0, 60 - elapsed);
                setTimeRemaining(remaining);
                
                if (remaining <= 0 && !hasAnswered && !isTimeUp) {
                  setIsTimeUp(true);
                  handleTimeUpSubmit();
                }
              }
            } catch (error) {
              console.error('Failed to fetch timer info:', error);
              // Fallback: use basic countdown
              setTimeRemaining(Math.max(0, 60));
            }
          } else if ((data as Record<string, unknown>).status === 'lobby') {
            // Reset timer and answer state when in lobby
            setTimeRemaining(60);
            setIsTimeUp(false);
            setHasAnswered(false);
            setLastResult(null);
            setAnswerValue('');
          }
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    };

    const interval = setInterval(pollGameState, 1000);
    pollGameState(); // Initial fetch

    return () => clearInterval(interval);
  }, [eventId, gameState, hasAnswered, isTimeUp, playerId, handleTimeUpSubmit]);


  const handleAnswerSubmit = async () => {
    if (!answerValue.trim() || !(gameState as Record<string, unknown>)?.currentQuestion || !playerId || !eventId || hasAnswered || isTimeUp || playerStatus === 'eliminated') return;

    const numericValue = parseInt(answerValue);
    if (isNaN(numericValue)) {
      alert('数値を入力してください');
      return;
    }

    // Check answer range
    const currentQuestion = (gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>;
    const minValue = Number(currentQuestion.minValue) || 0;
    const maxValue = Number(currentQuestion.maxValue) || 100;
    
    if (numericValue < minValue || numericValue > maxValue) {
      alert(`回答は${minValue}から${maxValue}の範囲で入力してください`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          playerId,
          questionId: currentQuestion.id,
          answerValue: numericValue,
          answerTime: Date.now() - (Number((gameState as Record<string, unknown>).questionStartTime) || Date.now()),
          minValue,
          maxValue,
        }),
      });

      const result = await response.json();
      if (result.success && result.accepted) {
        setHasAnswered(true);
        setLastResult(result);
        console.log('Answer submitted:', result);
      } else {
        alert(result.error || '回答に失敗しました');
        if (result.timeUp) {
          setIsTimeUp(true);
          setHasAnswered(true);
          setLastResult({
            yourAnswer: 0,
            message: result.error
          });
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('サーバーエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!nickname || !eventId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">こんにちは</p>
            <p className="font-bold text-lg text-gray-800">{nickname}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">ライフ</p>
            <div className="flex items-center gap-2">
              <p className={`font-bold text-lg ${
                playerLife > 50 ? 'text-green-600' : 
                playerLife > 20 ? 'text-yellow-600' : 'text-red-600'
              }`}>{playerLife}</p>
              <div className="w-12 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    playerLife > 50 ? 'bg-green-500' : 
                    playerLife > 20 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${playerLife}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* Eliminated Status */}
        {playerStatus === 'eliminated' && (
          <div className="bg-red-100 border-2 border-red-400 rounded-lg shadow-lg p-6 text-center mb-6">
            <h2 className="text-3xl font-bold text-red-800 mb-4">
              💀 ELIMINATED
            </h2>
            <p className="text-red-600 mb-4">
              残念！あなたは脱落しました
            </p>
            <p className="text-red-500 text-sm">
              他の参加者の戦いを見守りましょう
            </p>
          </div>
        )}

        {String((gameState as Record<string, unknown>)?.status) === 'lobby' && playerStatus !== 'eliminated' ? (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              待機中
            </h2>
            <p className="text-gray-600 mb-4">
              クイズの開始をお待ちください
            </p>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : null}

        {String((gameState as Record<string, unknown>)?.status) === 'active' && (gameState as Record<string, unknown>)?.currentQuestion && playerStatus !== 'eliminated' ? (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">

            {/* Timer */}
            <div className="text-center mb-4">
              <div className={`text-3xl font-bold ${
                timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 
                timeRemaining <= 30 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                ⏱️ {timeRemaining}秒
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    timeRemaining <= 10 ? 'bg-red-500' : 
                    timeRemaining <= 30 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.max(0, (timeRemaining / 60) * 100)}%` }}
                ></div>
              </div>
              {isTimeUp && (
                <div className="text-red-600 font-bold mt-2 animate-pulse">
                  ⚠️ 回答時間終了
                </div>
              )}
            </div>

            {/* Question */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {String(((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).title)}
              </h3>
              {((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).hint ? (
                <p className="text-sm text-gray-600 mt-2">
                  {String(((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).hint)}
                </p>
              ) : null}
              
              {/* Answer range display */}
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  回答範囲: {Number(((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).minValue) || 0} ～ {Number(((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).maxValue) || 100}
                </p>
              </div>
            </div>

            {/* Numerical Input */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="number"
                  value={answerValue}
                  onChange={(e) => !hasAnswered && !isTimeUp && setAnswerValue(e.target.value)}
                  disabled={hasAnswered || isTimeUp}
                  className={`w-full p-4 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    hasAnswered || isTimeUp
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                      : 'border-blue-300 focus:border-blue-500'
                  }`}
                  placeholder="数値を入力"
                  min={Number(((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).minValue) || 0}
                  max={Number(((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).maxValue) || 100}
                />
              </div>
            </div>

            {/* Answer Submitted Display */}
            {hasAnswered && lastResult ? (
              <div className="mb-6 p-4 rounded-lg border-2 bg-blue-50 border-blue-200">
                <div className="text-center">
                  <div className="text-lg font-bold mb-2 text-blue-800">
                    送信した回答: {String((lastResult as Record<string, unknown>).yourAnswer)}
                  </div>
                  <div className="text-sm text-blue-600">
                    {String((lastResult as Record<string, unknown>).message)}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Submit Button */}
            <div className="text-center">
              {!hasAnswered && !isTimeUp ? (
                <button
                  onClick={handleAnswerSubmit}
                  disabled={!answerValue.trim() || isSubmitting || timeRemaining <= 0}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg text-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '送信中...' : timeRemaining <= 0 ? '時間終了' : '回答する'}
                </button>
              ) : (
                <div className={`border rounded-lg p-4 ${
                  isTimeUp ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200'
                }`}>
                  <p className={`font-medium ${
                    isTimeUp ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {isTimeUp ? '⏰ 時間切れで回答終了' : '✅ 回答を送信しました！'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    isTimeUp ? 'text-red-600' : 'text-green-600'
                  }`}>
                    次の問題をお待ちください
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}


        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-white opacity-75 text-sm">
            管理者がゲームを開始すると、<br />
            ここに問題が表示されます
          </p>
        </div>
      </div>
    </div>
  );
}