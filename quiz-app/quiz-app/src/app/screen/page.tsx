'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ScreenDisplay() {
  const searchParams = useSearchParams();
  const [eventId, setEventId] = useState('');
  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [answerStats, setAnswerStats] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showingResults, setShowingResults] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [animatingParticipant, setAnimatingParticipant] = useState<string | null>(null);
  const [hasShownResults, setHasShownResults] = useState(false); // Track if results have been shown for current question
  const [resultStats, setResultStats] = useState<Record<string, unknown> | null>(null); // Persistent statistics after results shown

  // Get event ID from URL parameter
  useEffect(() => {
    const id = searchParams.get('e');
    if (id) {
      setEventId(id);
    }
  }, [searchParams]);

  // Real-time game state and participants polling
  useEffect(() => {
    if (!eventId) return;

    const pollData = async () => {
      try {
        // Fetch game state
        const stateResponse = await fetch(`/api/state?e=${eventId}`);
        let stateData: any = null;
        if (stateResponse.ok) {
          stateData = await stateResponse.json();
          console.log(`📺 SCREEN DEBUG Game state for ${eventId}:`, stateData.status, stateData.currentQuestion ? `question: ${stateData.currentQuestion.id}` : 'no question');
          
          // Check if question changed - reset results state for any question change
          const oldQuestionId = (gameState as any)?.currentQuestion?.id;
          const newQuestionId = (stateData as any)?.currentQuestion?.id;
          
          // Reset state when:
          // 1. Moving from one question to another (both exist and different)
          // 2. Moving from no question to a question (oldQuestionId is null/undefined)
          // 3. Question ID actually changed
          if (oldQuestionId !== newQuestionId) {
            console.log(`🔄 Question changed: ${oldQuestionId} -> ${newQuestionId}, resetting result state`);
            setHasShownResults(false);
            setShowingResults(false);
            setCurrentResultIndex(-1);
            setAnimatingParticipant(null);
            setResultStats(null);
          }
          
          setGameState(stateData);
        }

        // Fetch participants
        const participantsResponse = await fetch(`/api/participants?e=${eventId}`);
        if (participantsResponse.ok) {
          const participantsData = await participantsResponse.json();
          console.log(`📱 SCREEN DEBUG Participants for ${eventId}:`, participantsData.participants.length, 'participants');
          setParticipants(participantsData.participants || []);
        } else {
          console.error('Failed to fetch participants:', participantsResponse.status);
        }

        // Fetch answer stats only if there's an active question, it has an ID, and results haven't been shown yet
        const currentQuestionId = stateData?.currentQuestion?.id;
        if (stateData && 
            (stateData as Record<string, unknown>).status === 'active' && 
            currentQuestionId &&
            !hasShownResults && 
            !resultStats) {
          try {
            const answerResponse = await fetch(`/api/answer?e=${eventId}&q=${currentQuestionId}`);
            if (answerResponse.ok) {
              const answerData = await answerResponse.json();
              // If results are being shown, keep timer at 0
              if (showingResults || hasShownResults) {
                answerData.timeRemaining = 0;
              }
              setAnswerStats(answerData);
            } else {
              // Set defaults only if we don't have any stats yet
              setAnswerStats({
                totalAnswers: 0,
                totalParticipants: participants.length,
                timeRemaining: 60000,
                extensionCount: 0
              });
            }
          } catch (error) {
            console.error('Error fetching answer stats:', error);
            // Set defaults only if we don't have any stats yet
            setAnswerStats({
              totalAnswers: 0,
              totalParticipants: participants.length,
              timeRemaining: 60000,
              extensionCount: 0
            });
          }
        } else if (!hasShownResults && !resultStats) {
          // Clear answer stats only when not in active state and no results shown
          setAnswerStats(null);
        }
      } catch (error) {
        console.error('Failed to fetch screen data:', error);
      }
    };

    // Poll every 2.5 seconds for screen display
    const interval = setInterval(pollData, 2500);

    // Initial fetch
    pollData();

    return () => clearInterval(interval);
  }, [eventId]);

  // Helper function to check if statistics should be displayed
  const shouldShowStats = () => {
    // Only show stats when results have been explicitly shown
    return hasShownResults || showingResults;
  };

  // Game control functions
  const handleStartGame = async () => {
    if (!eventId || isLoading) return;
    
    setIsLoading(true);
    try {
      // Start the game
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action: 'startGame' })
      });

      // Start timer for the first question (q1)
      await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          questionId: 'q1', // Always start with first question
          action: 'start_question'
        })
      });
      console.log('Started timer for first question: q1');
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!eventId || isLoading) return;
    
    setIsLoading(true);
    try {
      // Move to next question
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action: 'nextQuestion' })
      });

      // Get updated game state to determine next question
      const updatedStateResponse = await fetch(`/api/state?e=${eventId}`);
      if (updatedStateResponse.ok) {
        const updatedState = await updatedStateResponse.json();
        if (updatedState.currentQuestion) {
          // Start timer for the current question after state update
          await fetch('/api/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId,
              questionId: updatedState.currentQuestion.id,
              action: 'start_question'
            })
          });
          console.log('Started timer for question:', updatedState.currentQuestion.id);
        }
      }
    } catch (error) {
      console.error('Failed to go to next question:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleResetGame = async () => {
    if (!eventId || isLoading) return;
    
    if (!confirm('ゲームをリセットしますか？全ての参加者のライフが100に戻り、回答がクリアされます。')) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Call both APIs to ensure complete reset
      await Promise.all([
        fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, action: 'resetGame' })
        }),
        fetch('/api/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, action: 'reset_game' })
        })
      ]);
      
      // Reset local state as well
      setGameState(null);
      setParticipants([]);
      setAnswerStats(null);
      setShowingResults(false);
      setCurrentResultIndex(-1);
      setAnimatingParticipant(null);
      setHasShownResults(false);
      setResultStats(null);
      
      console.log('Local screen state reset completed');
    } catch (error) {
      console.error('Failed to reset game:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeExtension = async (seconds: number) => {
    if (!eventId || !gameState?.currentQuestion || isLoading) return;
    
    setIsLoading(true);
    try {
      const action = seconds === 10 ? 'extend_10' : 'extend_30';
      const response = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          questionId: ((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).id,
          action
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Time extended:', result);
      }
    } catch (error) {
      console.error('Failed to extend time:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowResults = async () => {
    if (!eventId || !gameState?.currentQuestion || showingResults || hasShownResults) return;

    // 1. Set showingResults(true) to reveal statistics immediately
    setShowingResults(true);
    
    // 2. Set timer to 0 immediately when results button is clicked
    setAnswerStats(prev => prev ? { ...prev, timeRemaining: 0 } : null);

    // First, ensure all participants have answers (add 0 for unanswered)
    try {
      await fetch('/api/answer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          questionId: ((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).id
        })
      });
      console.log('Added timeout answers for unanswered participants');
    } catch (error) {
      console.error('Failed to add timeout answers:', error);
    }

    // Refetch answer stats to include newly added timeout answers
    let updatedAnswerStats = answerStats;
    try {
      const answerResponse = await fetch(`/api/answer?e=${eventId}&q=${((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).id}`);
      if (answerResponse.ok) {
        updatedAnswerStats = await answerResponse.json();
        console.log('Refetched answer stats for results:', updatedAnswerStats);
        // 4. Ensure timer stays at 0 after data refetch
        if (updatedAnswerStats) {
          (updatedAnswerStats as Record<string, unknown>).timeRemaining = 0;
        }
        setAnswerStats(updatedAnswerStats);
      }
    } catch (error) {
      console.error('Failed to refetch answer stats:', error);
    }

    // setShowingResults(true); // Already set above for immediate statistics display
    setCurrentResultIndex(0);

    // Get participants who answered this question (should now include all participants)
    const answeredParticipants = participants.filter(p => 
      (updatedAnswerStats as Record<string, unknown>)?.answers && 
      ((updatedAnswerStats as Record<string, unknown>).answers as Record<string, unknown>[])?.some((a: Record<string, unknown>) => a.playerId === (p as Record<string, unknown>).playerId)
    );

    // Show results one by one with animation
    for (let i = 0; i < answeredParticipants.length; i++) {
      setCurrentResultIndex(i);
      const participant = answeredParticipants[i];
      const answer = ((updatedAnswerStats as Record<string, unknown>)?.answers as Record<string, unknown>[])?.find((a: Record<string, unknown>) => a.playerId === (participant as Record<string, unknown>).playerId);
      
      if (answer) {
        // Show participant highlight
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Apply damage to this specific participant
        setAnimatingParticipant(String((participant as Record<string, unknown>).playerId));
        
        
        try {
          await fetch('/api/apply-damage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId,
              questionId: ((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).id,
              playerId: String((participant as Record<string, unknown>).playerId)
            })
          });
        } catch (error) {
          console.error('Failed to apply damage:', error);
        }
        
        // Wait for damage animation (extended duration)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        setAnimatingParticipant(null);
        // Note: damageDisplayData is not cleared - it persists until next question
      }
      
      // Wait before next participant
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Immediately save results and mark as shown (before animations even start)
    console.log('💾 SAVING resultStats immediately for question:', ((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).id, updatedAnswerStats);
    setResultStats(updatedAnswerStats);
    setHasShownResults(true);
    console.log('✅ hasShownResults set to TRUE for question:', ((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).id);

    // Reset after all animations but keep statistics visible
    setTimeout(() => {
      setShowingResults(false);
      setCurrentResultIndex(-1);
      setAnimatingParticipant(null);
      console.log('Results animation completed, persistent display should continue');
    }, 1000);
  };

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">クイズスクリーン</h1>
          <p className="text-xl">URLにイベントIDを指定してください</p>
          <p className="text-lg mt-2">例: /screen?e=おみくじ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 text-white">
      
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-5xl font-bold mb-2">懇親会クイズ</h1>
        <p className="text-2xl opacity-90">イベントID: {eventId}</p>
      </div>

      {gameState?.status === 'lobby' ? (
        <div className="text-center py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-6xl font-bold mb-8">
              参加者募集中
            </h2>
            <div className="text-3xl mb-8">
              参加者数: <span className="font-bold">{participants.length}人</span>
            </div>
            <div className="text-xl opacity-75 mb-8">
              スマートフォンでQRコードを読み取り、<br />
              イベントに参加してください
            </div>
            <div className="mt-12">
              <div className="text-8xl mb-8 animate-pulse">🎯</div>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={handleStartGame}
                  disabled={isLoading || participants.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg text-2xl font-bold transition-colors"
                >
                  {isLoading ? 'ゲーム開始中...' : 'ゲーム開始'}
                </button>
                {participants.length > 0 && (
                  <button 
                    onClick={handleResetGame}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg text-lg font-bold transition-colors"
                  >
                    リセット
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Active Question Display */}
      {gameState?.status === 'active' && (gameState as Record<string, unknown>)?.currentQuestion ? (
        <div className="py-12">
          <div className="max-w-6xl mx-auto px-8">

            {/* Question Title and Timer */}
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold mb-6">
                {(gameState as any).currentQuestion.title}
              </h3>
              
              {/* Real-time Timer Display */}
              <div className="bg-gray-900 bg-opacity-90 backdrop-blur-sm rounded-xl p-6 mb-6 border-2 border-gray-300">
                <div className="text-center">
                  <div className="text-2xl text-white font-bold mb-2">残り時間</div>
                  <div className={`text-8xl font-bold ${
                    ((answerStats as any)?.timeRemaining / 1000) <= 10 ? 'text-red-400 animate-pulse' : 
                    ((answerStats as any)?.timeRemaining / 1000) <= 30 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {Math.max(0, Math.ceil(((answerStats as any)?.timeRemaining || 0) / 1000))}
                  </div>
                  <div className="text-xl text-white font-bold">秒</div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-600 rounded-full h-4 mt-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-1000 ${
                        ((answerStats as any)?.timeRemaining / 1000) <= 10 ? 'bg-red-400' : 
                        ((answerStats as any)?.timeRemaining / 1000) <= 30 ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${Math.max(0, (((answerStats as any)?.timeRemaining || 0) / 1000) / 60 * 100)}%` }}
                    ></div>
                  </div>
                  
                  {/* Extension info */}
                  {(answerStats as any)?.extensionCount > 0 ? (
                    <div className="mt-3 text-lg text-blue-300">
                      延長: +{(answerStats as any).extensionCount}秒
                    </div>
                  ) : null}
                </div>
              </div>
              
              {/* Answer Range Display */}
              <div className="bg-gray-900 bg-opacity-90 backdrop-blur-sm rounded-xl p-4 mb-6 border-2 border-blue-400">
                <div className="text-center">
                  <div className="text-xl text-white font-bold mb-2">回答範囲</div>
                  <div className="text-3xl font-bold text-blue-400">
                    {Number(((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).minValue) || 0} ～ {Number(((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).maxValue) || 100}
                  </div>
                </div>
              </div>
              
              {/* Answer Progress */}
              <div className="bg-gray-900 bg-opacity-90 backdrop-blur-sm rounded-xl p-4 mb-6 border-2 border-purple-400">
                <div className="text-center">
                  <div className="text-xl text-white font-bold mb-2">回答状況</div>
                  <div className="text-4xl font-bold text-purple-400 mb-2">
                    {(answerStats as any)?.totalAnswers || 0} / {participants.length}
                  </div>
                  <div className="text-lg text-white font-bold">
                    {participants.length > 0 ? Math.round((((answerStats as any)?.totalAnswers || 0) / participants.length) * 100) : 0}% 完了
                  </div>
                  
                  {/* Answer Progress Bar */}
                  <div className="w-full bg-gray-600 rounded-full h-3 mt-3">
                    <div 
                      className="h-3 bg-purple-400 rounded-full transition-all duration-500"
                      style={{ width: `${participants.length > 0 ? (((answerStats as any)?.totalAnswers || 0) / participants.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* Time Extension Controls */}
              <div className="flex justify-center gap-4 mb-6">
                <button 
                  onClick={() => handleTimeExtension(10)}
                  disabled={isLoading}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
                >
                  ⏰ +10秒延長
                </button>
                <button 
                  onClick={() => handleTimeExtension(30)}
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
                >
                  ⏰ +30秒延長
                </button>
              </div>
            </div>

            {/* Battle Quiz Stats */}
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* Correct Answer */}
                <div className="bg-green-500 bg-opacity-20 backdrop-blur-sm rounded-xl p-6 border-2 border-green-400">
                  <div className="text-center">
                    <div className="text-2xl opacity-75 mb-2">正解</div>
                    <div className="text-6xl font-bold text-green-400">
                      {shouldShowStats() ? 
                        String(((resultStats || answerStats) as Record<string, unknown>)?.correctAnswer || ((gameState as Record<string, unknown>).currentQuestion as Record<string, unknown>).correctAnswer || '?')
                        : '???'
                      }
                    </div>
                    {!shouldShowStats() && (
                      <div className="text-sm text-green-300 mt-2">結果発表後に表示</div>
                    )}
                  </div>
                </div>

                {/* Average Answer */}
                <div className="bg-blue-500 bg-opacity-20 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-400">
                  <div className="text-center">
                    <div className="text-2xl opacity-75 mb-2">平均回答</div>
                    <div className="text-6xl font-bold text-blue-400">
                      {shouldShowStats() ? String(((resultStats || answerStats) as Record<string, unknown>)?.averageAnswer || '-') : '???'}
                    </div>
                    {!shouldShowStats() && (
                      <div className="text-sm text-blue-300 mt-2">結果発表後に表示</div>
                    )}
                  </div>
                </div>

                {/* Average Damage */}
                <div className="bg-red-500 bg-opacity-20 backdrop-blur-sm rounded-xl p-6 border-2 border-red-400">
                  <div className="text-center">
                    <div className="text-2xl opacity-75 mb-2">平均ダメージ</div>
                    <div className="text-6xl font-bold text-red-400">
                      {shouldShowStats() ? String(((resultStats || answerStats) as Record<string, unknown>)?.averageDamage || '-') : '???'}
                    </div>
                    {!shouldShowStats() && (
                      <div className="text-sm text-red-300 mt-2">結果発表後に表示</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Life Status */}
              <div className="bg-gray-900 bg-opacity-90 backdrop-blur-sm rounded-xl p-6 border-2 border-gray-300">
                <h3 className="text-3xl font-bold text-center mb-6 text-white">参加者ライフ状況</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {participants.map((participant) => {
                    const isAnimating = animatingParticipant === participant.playerId;
                    const isCurrentResult = showingResults && participants.filter(p => 
                      (resultStats || answerStats)?.answers && 
                      ((resultStats || answerStats) as any)?.answers?.some((a: any) => a.playerId === p.playerId)
                    ).indexOf(participant) === currentResultIndex;
                    // Prioritize resultStats for persistent display, fallback to answerStats for real-time
                    const answer = ((resultStats as any)?.answers)?.find((a: any) => a.playerId === participant.playerId) || 
                                   ((answerStats as any)?.answers)?.find((a: any) => a.playerId === participant.playerId);
                    
                    return (
                      <div 
                        key={participant.playerId} 
                        className={`bg-white bg-opacity-10 rounded-lg p-4 text-center transition-all duration-500 relative ${
                          isCurrentResult ? 'ring-4 ring-yellow-400 scale-105 bg-opacity-20' : ''
                        } ${isAnimating ? 'animate-pulse scale-110' : ''} ${
                          participant.status === 'eliminated' ? 'opacity-60 bg-gray-500 bg-opacity-30' : ''
                        }`}
                        style={{ zIndex: isAnimating ? 30 : 'auto' }}
                      >
                        {/* Damage Animation - Floating above participant card */}
                        {isAnimating && answer && (
                          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-30 animate-bounce">
                            <div className={`px-4 py-2 rounded-xl font-bold text-2xl shadow-2xl border-4 ${
                              answer.isLastAnswerer 
                                ? 'bg-yellow-100 text-yellow-900 border-yellow-500 animate-pulse' 
                                : 'bg-red-100 text-red-900 border-red-500'
                            }`}
                            style={{ animationDuration: '0.8s', animationIterationCount: '6' }}>
                              -{answer.damage}
                              {answer.isLastAnswerer && (
                                <div className="text-sm text-yellow-700 mt-1 font-black">⚡ 2倍！</div>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="text-lg font-bold mb-2 text-gray-900 bg-white bg-opacity-90 rounded px-2 py-1">{participant.nickname}</div>
                        
                        
                        
                        {/* Show answer info during results (highlight during animation) */}
                        {isCurrentResult && answer && (
                          <div className="mb-3 p-2 bg-black bg-opacity-30 rounded text-sm border-2 border-yellow-400">
                            <div className="text-white">回答: {answer.answerValue}</div>
                            <div className="text-white">正解: {String(((resultStats || answerStats) as Record<string, unknown>)?.correctAnswer)}</div>
                            <div className={`font-bold ${
                              answer.isLastAnswerer ? 
                                'text-yellow-300 animate-pulse' : 
                                'text-red-400'
                            }`}>
                              ダメージ: {answer.damage}
                              {answer.isLastAnswerer && (
                                <div className="text-xs text-yellow-200 animate-bounce mt-1">
                                  ⚡ 最終回答者 2倍ダメージ！
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Show damage info after results (persistent display) */}
                        {hasShownResults && answer && !isCurrentResult && (
                          <div className="mb-3 p-2 bg-gray-800 bg-opacity-50 rounded text-sm border border-gray-400">
                            <div className="text-gray-300 text-xs">この問題での結果:</div>
                            <div className="text-white text-sm">回答: {answer.answerValue}</div>
                            <div className={`font-bold text-sm ${
                              answer.isLastAnswerer ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              -{answer.damage}
                              {answer.isLastAnswerer && (
                                <span className="text-xs text-yellow-300 ml-1">⚡2倍</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="mb-2">
                          <div className={`text-3xl font-bold transition-all duration-500 ${
                            isAnimating && Boolean((answer as Record<string, unknown>)?.isLastAnswerer) ? 'text-yellow-300 scale-150 animate-pulse' :
                            isAnimating ? 'text-red-500 scale-125' : 
                            participant.status === 'eliminated' ? 'text-gray-400' :
                            (participant.life !== undefined ? participant.life : 100) > 50 ? 'text-green-400' 
                            : (participant.life !== undefined ? participant.life : 100) > 20 ? 'text-yellow-400'
                            : 'text-red-400'
                          }`}>
                            {participant.life !== undefined ? participant.life : 100}
                          </div>
                          <div className="text-sm opacity-75 text-black font-bold">HP</div>
                        </div>
                        
                        {/* Life Bar */}
                        <div className="w-full bg-gray-600 rounded-full h-3 relative overflow-hidden">
                          <div 
                            className={`h-3 rounded-full transition-all duration-1000 ${
                              participant.status === 'eliminated' ? 'bg-gray-400' :
                              (participant.life !== undefined ? participant.life : 100) > 50 ? 'bg-green-400' 
                              : (participant.life !== undefined ? participant.life : 100) > 20 ? 'bg-yellow-400'
                              : 'bg-red-400'
                            }`}
                            style={{ width: `${participant.life !== undefined ? participant.life : 100}%` }}
                          ></div>
                          
                          {/* Damage animation overlay */}
                          {isAnimating ? (
                            <div className={`absolute inset-0 opacity-50 animate-ping ${
                              Boolean((answer as Record<string, unknown>)?.isLastAnswerer) ? 'bg-yellow-400' : 'bg-red-500'
                            }`}></div>
                          ) : null}
                          
                          {/* Special 2x damage effect */}
                          {(isAnimating && Boolean((answer as Record<string, unknown>)?.isLastAnswerer)) ? (
                            <>
                              <div className="absolute inset-0 bg-yellow-300 opacity-30 animate-pulse"></div>
                              <div className="absolute -top-2 -right-2 text-yellow-300 font-bold text-xs animate-bounce">
                                2x
                              </div>
                            </>
                          ) : null}
                        </div>
                        
                        
                        <div className="relative"> {/* Wrapper to contain life bar effects */}
                          {/* Life Bar continues here... */}
                        </div>
                        
                        {/* Elimination status */}
                        {(participant.status === 'eliminated' || (participant.life !== undefined && participant.life <= 0)) && (
                          <div className="mt-2 text-gray-400 font-bold text-sm">
                            💀 ELIMINATED
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Battle Stats */}
            <div className="text-center mt-8">
              <div className="text-2xl mb-4">
                回答済み: <span className="font-bold">{(answerStats as any)?.totalAnswers || 0}</span>人 
                / 参加者: <span className="font-bold">{participants.length}</span>人
              </div>
              
              {/* Results announcement progress */}
              {showingResults && (
                <div className="mb-6 p-4 bg-yellow-500 bg-opacity-20 rounded-lg border-2 border-yellow-400">
                  <div className="text-2xl font-bold text-yellow-300 mb-2">
                    🎯 結果発表中...
                  </div>
                  <div className="text-lg mb-2">
                    {currentResultIndex + 1} / {participants.filter(p => 
                      ((resultStats || answerStats) as any)?.answers?.some((a: any) => String(a.playerId) === String(p.playerId))
                    ).length} 人目
                  </div>
                  
                  {/* Show 2x damage indicator for current player */}
                  {(() => {
                    const answeredParticipants = participants.filter(p => 
                      ((resultStats || answerStats) as any)?.answers?.some((a: any) => String(a.playerId) === String(p.playerId))
                    );
                    const currentParticipant = answeredParticipants[currentResultIndex];
                    const currentAnswer = ((resultStats || answerStats) as any)?.answers?.find((a: any) => 
                      String(a.playerId) === String(currentParticipant?.playerId)
                    );
                    
                    return Boolean(currentAnswer?.isLastAnswerer) && (
                      <div className="text-center">
                        <div className="inline-flex items-center px-3 py-1 bg-yellow-400 bg-opacity-30 rounded-full border border-yellow-300">
                          <span className="text-yellow-200 font-bold text-sm animate-pulse">
                            ⚡ 最終回答者 - 2倍ダメージ適用！
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* Question Control Buttons */}
              <div className="flex justify-center gap-4 mt-8">
                <button 
                  onClick={handleShowResults}
                  disabled={isLoading || showingResults || hasShownResults || participants.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg text-lg font-medium"
                >
                  {showingResults ? '発表中...' : hasShownResults ? '発表済み' : '結果発表'}
                </button>
                <button 
                  onClick={handleNextQuestion}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg text-lg font-medium"
                >
                  {isLoading ? '進行中...' : '次の問題へ'}
                </button>
                <button 
                  onClick={handleResetGame}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg text-lg font-medium"
                >
                  リセット
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <div className="text-center py-8">
        <p className="text-lg opacity-75">
          管理画面とAPI接続により、リアルタイム表示が可能になります
        </p>
      </div>
    </div>
  );
}

function ScreenPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">懇親会クイズ</h1>
        <p className="text-xl opacity-75">画面を読み込み中...</p>
      </div>
    </div>
  );
}

export default function ScreenPage() {
  return (
    <Suspense fallback={<ScreenPageLoading />}>
      <ScreenDisplay />
    </Suspense>
  );
}