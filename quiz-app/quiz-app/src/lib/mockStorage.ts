// Enhanced global storage with multiple fallback strategies
/* eslint-disable @typescript-eslint/no-explicit-any */

interface GlobalMockStorage {
  gameStates: { [eventId: string]: any };
  participants: { [eventId: string]: any[] };
  answers: { [key: string]: any[] };
}

// 複数のグローバルオブジェクトを試して最も永続的なものを使用
function getGlobalStorage(): GlobalMockStorage {
  const globalKey = '__QUIZ_APP_STORAGE_V2__';
  
  // 複数のグローバルコンテキストを試す
  const contexts = [
    global,                    // Node.js global
    globalThis,               // 標準グローバル
    (global as any).process?.env  // process.envに保存も試す
  ].filter(Boolean);
  
  // 既存のストレージを探す
  for (const ctx of contexts) {
    if (ctx && (ctx as any)[globalKey]) {
      console.log('♻️ STORAGE: Reusing existing storage from', ctx === global ? 'global' : ctx === globalThis ? 'globalThis' : 'process');
      return (ctx as any)[globalKey];
    }
  }
  
  // 新規作成
  console.log('🔄 STORAGE: Creating new storage instance');
  const newStorage = {
    gameStates: {},
    participants: {},
    answers: {},
    _createdAt: new Date().toISOString(),
    _instanceId: Math.random().toString(36).substr(2, 9)
  };
  
  // 全てのコンテキストに保存
  contexts.forEach(ctx => {
    if (ctx) {
      (ctx as any)[globalKey] = newStorage;
    }
  });
  
  return newStorage;
}

// プロキシで動的アクセスを保証
export const mockStorage = new Proxy({} as GlobalMockStorage, {
  get(target, prop: string) {
    const storage = getGlobalStorage();
    return storage[prop as keyof GlobalMockStorage];
  },
  set(target, prop: string, value) {
    const storage = getGlobalStorage();
    storage[prop as keyof GlobalMockStorage] = value;
    return true;
  }
});

// Battle Quiz questions - numerical answers (no time limits)
export const mockQuestions = [
  {
    id: 'q1',
    title: '日本の食料自給率は？（％）',
    type: 'numerical',
    correctAnswer: 38,
    hint: '0-100の数値で回答してください'
  },
  {
    id: 'q2', 
    title: '東京タワーの高さは？（メートル）',
    type: 'numerical', 
    correctAnswer: 333,
    hint: '0-500の数値で回答してください',
    maxValue: 500
  },
  {
    id: 'q3',
    title: '日本の人口は？（百万人）',
    type: 'numerical',
    correctAnswer: 125,
    hint: '50-200の数値で回答してください',
    maxValue: 200
  },
  {
    id: 'q4',
    title: '富士山の高さは？（メートル）',
    type: 'numerical',
    correctAnswer: 3776,
    hint: '3000-4000の数値で回答してください',
    maxValue: 4000
  }
];

// Correct answers mapping
export const correctAnswers: { [key: string]: number } = {
  'q1': 38,   // 日本の食料自給率
  'q2': 333,  // 東京タワーの高さ
  'q3': 125,  // 日本の人口（百万人）
  'q4': 3776, // 富士山の高さ
};