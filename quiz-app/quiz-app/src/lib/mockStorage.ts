// Mock storage shared between API routes using globalThis
// In production, this would be replaced with a database

interface GlobalMockStorage {
  gameStates: { [eventId: string]: unknown };
  participants: { [eventId: string]: unknown[] };
  answers: { [key: string]: unknown[] };
}

const globalForMockStorage = globalThis as unknown as {
  mockStorage: GlobalMockStorage | undefined;
};

export const mockStorage = globalForMockStorage.mockStorage ?? {
  gameStates: {},
  participants: {},
  answers: {},
};

globalForMockStorage.mockStorage = mockStorage;

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