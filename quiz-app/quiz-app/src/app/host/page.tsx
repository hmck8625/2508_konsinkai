'use client';

import { useState, useEffect, useCallback } from 'react';

export default function HostPage() {
  const [eventId, setEventId] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState({
    title: '',
    choices: ['', '', '', ''],
    answerIndex: 0,
    timeLimitSec: 20,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [gameState, setGameState] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  const handleAuthenticate = () => {
    if (eventId && adminSecret) {
      setIsAuthenticated(true);
      localStorage.setItem('quiz-admin-secret', adminSecret);
      localStorage.setItem('quiz-admin-event-id', eventId);
    }
  };

  // Load saved credentials
  useEffect(() => {
    const savedSecret = localStorage.getItem('quiz-admin-secret');
    const savedEventId = localStorage.getItem('quiz-admin-event-id');
    
    if (savedSecret && savedEventId) {
      setAdminSecret(savedSecret);
      setEventId(savedEventId);
      setIsAuthenticated(true);
    }
  }, []);

  // Real-time game state polling
  useEffect(() => {
    if (!isAuthenticated || !eventId) return;

    const pollGameState = async () => {
      try {
        const response = await fetch(`/api/state?e=${eventId}`);
        if (response.ok) {
          const data = await response.json();
          setGameState(data);
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    };

    const pollParticipants = async () => {
      try {
        const response = await fetch(`/api/participants?e=${eventId}`);
        if (response.ok) {
          const data = await response.json();
          setParticipants(data.participants || []);
        }
      } catch (error) {
        console.error('Failed to fetch participants:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(() => {
      pollGameState();
      pollParticipants();
    }, 2000);

    // Initial fetch
    pollGameState();
    pollParticipants();

    return () => clearInterval(interval);
  }, [isAuthenticated, eventId]);

  const handleCreateEvent = async () => {
    setIsLoading(true);
    setMessage('イベントを作成中...');

    // モックデータでの簡易作成
    setTimeout(() => {
      setMessage(`イベント "${eventId}" を作成しました！`);
      setIsLoading(false);
    }, 1000);
  };

  const handleAddQuestion = () => {
    if (newQuestion.title.trim() && newQuestion.choices.every(c => c.trim())) {
      const question = {
        id: (questions.length + 1).toString(),
        title: newQuestion.title.trim(),
        choices: newQuestion.choices.map(c => c.trim()),
        answerIndex: newQuestion.answerIndex,
        timeLimitSec: newQuestion.timeLimitSec,
      };

      setQuestions([...questions, question]);
      setNewQuestion({
        title: '',
        choices: ['', '', '', ''],
        answerIndex: 0,
        timeLimitSec: 20,
      });
      setMessage(`問題 ${questions.length + 1} を追加しました`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            管理画面ログイン
          </h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                イベントID
              </label>
              <input
                type="text"
                value={eventId}
                onChange={(e) => setEventId(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: おみくじ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理者パスワード
              </label>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="管理者パスワード"
              />
            </div>

            <button
              onClick={handleAuthenticate}
              disabled={!eventId || !adminSecret}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              ログイン
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              クイズ管理画面
            </h1>
            <p className="text-gray-600">イベントID: {eventId}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem('quiz-admin-secret');
                localStorage.removeItem('quiz-admin-event-id');
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.startsWith('エラー') 
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-green-50 border border-green-200 text-green-600'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Event Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              イベント管理
            </h2>

            {/* Event Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {participants.length}人
                </div>
                <div className="text-sm text-blue-600">参加者数</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {gameState?.status || 'lobby'}
                </div>
                <div className="text-sm text-green-600">ゲーム状態</div>
              </div>
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-2">参加者一覧</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <span>{participant.nickname}</span>
                      <span className="text-gray-500">{new Date(participant.joinedAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">
                開発中：Vercel KV未接続のため、基本機能のみ利用可能
              </p>
              <button
                onClick={handleCreateEvent}
                disabled={isLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? '作成中...' : 'イベントを作成'}
              </button>
            </div>

            {/* Mock Game Controls */}
            <div className="mt-6 space-y-2">
              <h3 className="font-bold text-gray-800">ゲーム進行（デモ）</h3>
              <div className="flex flex-wrap gap-2">
                <button className="bg-green-600 text-white px-3 py-2 rounded text-sm">
                  第1問開始
                </button>
                <button className="bg-red-600 text-white px-3 py-2 rounded text-sm">
                  回答締切
                </button>
                <button className="bg-blue-600 text-white px-3 py-2 rounded text-sm">
                  正解発表
                </button>
                <button className="bg-purple-600 text-white px-3 py-2 rounded text-sm">
                  最終結果
                </button>
              </div>
            </div>
          </div>

          {/* Question Management */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              問題管理
            </h2>

            {/* Add Question Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  問題文
                </label>
                <input
                  type="text"
                  value={newQuestion.title}
                  onChange={(e) => setNewQuestion({...newQuestion, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="問題文を入力"
                />
              </div>

              {newQuestion.choices.map((choice, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    選択肢 {String.fromCharCode(65 + index)}
                    {index === newQuestion.answerIndex && (
                      <span className="text-green-600 ml-1">（正解）</span>
                    )}
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={choice}
                      onChange={(e) => {
                        const newChoices = [...newQuestion.choices];
                        newChoices[index] = e.target.value;
                        setNewQuestion({...newQuestion, choices: newChoices});
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`選択肢${String.fromCharCode(65 + index)}`}
                    />
                    <button
                      onClick={() => setNewQuestion({...newQuestion, answerIndex: index})}
                      className={`px-3 py-2 rounded-r-md border border-l-0 border-gray-300 ${
                        index === newQuestion.answerIndex
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      正解
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddQuestion}
                disabled={!newQuestion.title.trim() || !newQuestion.choices.every(c => c.trim())}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                問題を追加
              </button>
            </div>

            {/* Questions List */}
            {questions.length > 0 && (
              <>
                <h3 className="font-bold text-gray-800 mb-2">
                  登録済み問題（{questions.length}問）
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                  {questions.map((q, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <p className="font-medium">Q{index + 1}: {q.title}</p>
                      <p className="text-sm text-gray-600">
                        正解: {String.fromCharCode(65 + q.answerIndex)}. {q.choices[q.answerIndex]}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-gray-500">
          <p>💡 完全機能を利用するには、Vercel KVデータベースの設定が必要です</p>
          <p>現在はローカル開発・デモモードで動作中</p>
        </div>
      </div>
    </div>
  );
}