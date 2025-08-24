export interface QuizEvent {
  id: string;
  code: string;
  title: string;
  status: EventStatus;
  config: EventConfig;
  createdAt: string;
}

export interface EventConfig {
  speedBonusEnabled: boolean;
  speedBonusMax: number;
  timeLimitDefault: number;
  streakBonusEnabled: boolean;
  ttlSeconds: number;
}

export interface Question {
  id: string;
  title: string;
  choices: [string, string, string, string];
  answerIndex: number;
  timeLimitSec: number;
  minValue: number;
  maxValue: number;
  correctAnswer: number;
}

export interface Player {
  id: string;
  nickname: string;
  deviceId: string;
  joinedAt: string;
  kicked: boolean;
}

export interface Answer {
  playerId: string;
  choice: number;
  answerValue: number;
  timestamp: number;
  isCorrect: boolean;
  scoreDelta: number;
  damage: number;
  isLastAnswerer: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  score: number;
  totalTimeMs: number;
}

export interface GameState {
  status: EventStatus;
  currentQuestion?: Question;
  serverTime: number;
  leaderboard: LeaderboardEntry[];
  questionStats?: QuestionStats;
  questionStartTime?: number;
  questionEndTime?: number;
  timeRemaining?: number;
  totalAnswers?: number;
  extensionCount?: number;
}

export interface QuestionStats {
  correctRate: number;
  totalAnswers: number;
  fastest: Array<{
    playerId: string;
    nickname: string;
    timeMs: number;
  }>;
}

export type EventStatus = 
  | 'lobby'
  | `Q${number}_open`
  | `Q${number}_closed`
  | `Q${number}_reveal`
  | 'results';

export interface JoinRequest {
  eventCode: string;
  nickname: string;
  deviceId: string;
}

export interface JoinResponse {
  success: boolean;
  playerId?: string;
  nickname?: string;
  error?: string;
}

export interface AnswerRequest {
  playerId: string;
  eventId: string;
  questionId: string;
  choice: number;
  answerValue: number;
  answerTime: number;
}

export interface AnswerResponse {
  success: boolean;
  accepted: boolean;
  isCorrect?: boolean;
  scoreDelta?: number;
  error?: string;
}

export interface ControlRequest {
  action: 'open' | 'close' | 'reveal' | 'next' | 'extend' | 'reset' | 'extend_10' | 'extend_30';
  questionId?: string;
  extendSeconds?: number;
}

export interface ControlResponse {
  success: boolean;
  status: EventStatus;
  error?: string;
}