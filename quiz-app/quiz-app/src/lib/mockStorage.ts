// Simple global storage for both local and Vercel environments
/* eslint-disable @typescript-eslint/no-explicit-any */

interface GlobalMockStorage {
  gameStates: { [eventId: string]: any };
  participants: { [eventId: string]: any[] };
  answers: { [key: string]: any[] };
}

// Vercel環境でも動作するglobalオブジェクトベースのストレージ
function getGlobalStorage(): GlobalMockStorage {
  const globalKey = '__QUIZ_APP_STORAGE__';
  
  if (!(global as any)[globalKey]) {
    console.log('🔄 STORAGE: Creating new instance');
    (global as any)[globalKey] = {
      gameStates: {},
      participants: {},
      answers: {},
    };
  }

  return (global as any)[globalKey];
}

export const mockStorage = getGlobalStorage();

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