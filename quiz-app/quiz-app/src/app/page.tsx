'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Simple UUID replacement for demo
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function Home() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getDeviceId = () => {
    let deviceId = localStorage.getItem('quiz-device-id');
    if (!deviceId) {
      deviceId = generateId();
      localStorage.setItem('quiz-device-id', deviceId);
    }
    return deviceId;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsJoining(true);

    try {
      const deviceId = getDeviceId();
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventCode: eventCode.toUpperCase(),
          nickname: nickname.trim(),
          deviceId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Store player info
        localStorage.setItem('quiz-player-id', result.playerId);
        localStorage.setItem('quiz-player-nickname', result.nickname);
        localStorage.setItem('quiz-event-id', eventCode.toUpperCase());
        
        // Redirect to play page
        router.push('/play');
      } else {
        setError(result.error || 'エラーが発生しました');
      }
    } catch (error) {
      console.error('Join error:', error);
      setError('サーバーエラーが発生しました');
    } finally {
      setIsJoining(false);
    }
  };

  if (!isClient) {
    return <div></div>; // Prevent hydration mismatch
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          {/* Logo/Title */}
          <div className="mb-12">
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 drop-shadow-lg">
              🎯
            </h1>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
              懇親会クイズ
            </h2>
            <p className="text-xl text-white opacity-90 drop-shadow">
              イベントに参加しましょう！
            </p>
          </div>

          {/* Join Form */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <label htmlFor="eventCode" className="block text-sm font-medium text-gray-700 mb-2">
                  イベントコード
                </label>
                <input
                  type="text"
                  id="eventCode"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-center text-lg font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: おみくじ"
                  maxLength={10}
                  required
                />
              </div>

              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                  ニックネーム
                </label>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="表示名を入力"
                  maxLength={20}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  他の参加者と同じ名前の場合、自動で番号が付きます
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining || !eventCode.trim() || !nickname.trim()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md text-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isJoining ? '参加中...' : '参加する'}
              </button>
            </form>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center text-white opacity-75">
            <p className="text-sm">
              スマートフォンでの参加を推奨します
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
