// Mock storage shared between API routes using globalThis
// In production, this would be replaced with a database

/* eslint-disable @typescript-eslint/no-explicit-any */
interface GlobalMockStorage {
  gameStates: { [eventId: string]: any };
  participants: { [eventId: string]: any[] };
  answers: { [key: string]: any[] };
}

// より安定したストレージアクセスパターン
function getGlobalStorage(): GlobalMockStorage {
  const globalForMockStorage = globalThis as unknown as {
    mockStorage: GlobalMockStorage | undefined;
  };

  if (!globalForMockStorage.mockStorage) {
    console.log('🔄 STORAGE DEBUG: Creating new mockStorage instance');
    globalForMockStorage.mockStorage = {
      gameStates: {},
      participants: {},
      answers: {},
    };
  } else {
    console.log('🔗 STORAGE DEBUG: Reusing existing mockStorage');
  }

  return globalForMockStorage.mockStorage;
}

// プロキシを使用してアクセス時に常に最新のストレージを取得
export const mockStorage = new Proxy({} as GlobalMockStorage, {
  get(target, prop: keyof GlobalMockStorage) {
    const storage = getGlobalStorage();
    return storage[prop];
  },
  set(target, prop: keyof GlobalMockStorage, value) {
    const storage = getGlobalStorage();
    storage[prop] = value;
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