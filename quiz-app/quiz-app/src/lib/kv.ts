import { kv } from '@vercel/kv';
import { mockKv } from './mock-kv';
import { EventStatus, Player, Question, Answer, LeaderboardEntry, QuizEvent, EventConfig } from '@/types/quiz';

// 開発環境でVercel KVが利用できない場合はモックを使用
const kvClient = process.env.KV_REST_API_URL ? kv : mockKv;

export class KVService {
  private static instance: KVService;

  public static getInstance(): KVService {
    if (!KVService.instance) {
      KVService.instance = new KVService();
    }
    return KVService.instance;
  }

  // Event management
  async createEvent(eventId: string, code: string, title: string, config: EventConfig): Promise<void> {
    const event: QuizEvent = {
      id: eventId,
      code,
      title,
      status: 'lobby',
      config,
      createdAt: new Date().toISOString(),
    };
    
    await kvClient.setex(`event:${eventId}:meta`, config.ttlSeconds, event);
    await kvClient.setex(`event:${eventId}:status`, config.ttlSeconds, 'lobby');
    await kvClient.setex(`event:${eventId}:config`, config.ttlSeconds, config);
  }

  async getEventByCode(code: string): Promise<QuizEvent | null> {
    // In a real implementation, you would need an index. For simplicity, assuming eventId = code
    try {
      const event = await kvClient.get(`event:${code}:meta`);
      return event as QuizEvent | null;
    } catch {
      return null;
    }
  }

  async getEventStatus(eventId: string): Promise<EventStatus | null> {
    return await kvClient.get(`event:${eventId}:status`);
  }

  async setEventStatus(eventId: string, status: EventStatus): Promise<void> {
    const ttl = await this.getTTL(eventId);
    await kvClient.setex(`event:${eventId}:status`, ttl, status);
  }

  // Question management
  async setQuestion(eventId: string, questionId: string, question: Question): Promise<void> {
    const ttl = await this.getTTL(eventId);
    await kvClient.setex(`event:${eventId}:q:${questionId}:meta`, ttl, question);
  }

  async getQuestion(eventId: string, questionId: string): Promise<Question | null> {
    return await kvClient.get(`event:${eventId}:q:${questionId}:meta`);
  }

  // Player management
  async addPlayer(eventId: string, player: Player): Promise<void> {
    const ttl = await this.getTTL(eventId);
    await kvClient.sadd(`event:${eventId}:players`, player.id);
    await kvClient.setex(`event:${eventId}:player:${player.id}`, ttl, player);
    await kvClient.expire(`event:${eventId}:players`, ttl);
  }

  async getPlayer(eventId: string, playerId: string): Promise<Player | null> {
    return await kvClient.get(`event:${eventId}:player:${playerId}`);
  }

  async getPlayers(eventId: string): Promise<Player[]> {
    const playerIds = await kvClient.smembers(`event:${eventId}:players`);
    const players: Player[] = [];
    
    for (const playerId of playerIds) {
      const player = await this.getPlayer(eventId, playerId);
      if (player && !player.kicked) {
        players.push(player);
      }
    }
    
    return players;
  }

  async isNicknameExists(eventId: string, nickname: string): Promise<boolean> {
    const players = await this.getPlayers(eventId);
    return players.some(p => p.nickname.toLowerCase() === nickname.toLowerCase());
  }

  // Answer management
  async submitAnswer(eventId: string, questionId: string, answer: Answer): Promise<boolean> {
    const ttl = await this.getTTL(eventId);
    const key = `event:${eventId}:q:${questionId}:answer:${answer.playerId}`;
    
    // Use SET with NX (only if not exists) to ensure one answer per player per question
    const result = await kvClient.set(key, answer, { nx: true, ex: ttl });
    return result === 'OK';
  }

  async getAnswer(eventId: string, questionId: string, playerId: string): Promise<Answer | null> {
    return await kvClient.get(`event:${eventId}:q:${questionId}:answer:${playerId}`);
  }

  async getQuestionAnswers(eventId: string, questionId: string): Promise<Answer[]> {
    const players = await this.getPlayers(eventId);
    const answers: Answer[] = [];
    
    for (const player of players) {
      const answer = await this.getAnswer(eventId, questionId, player.id);
      if (answer) {
        answers.push(answer);
      }
    }
    
    return answers;
  }

  // Leaderboard management
  async updatePlayerScore(eventId: string, playerId: string, scoreDelta: number): Promise<void> {
    const ttl = await this.getTTL(eventId);
    const currentScore = await kvClient.get(`event:${eventId}:score:${playerId}`) as number || 0;
    const newScore = currentScore + scoreDelta;
    await kvClient.setex(`event:${eventId}:score:${playerId}`, ttl, newScore);
  }

  async getLeaderboard(eventId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    const players = await this.getPlayers(eventId);
    const leaderboard: LeaderboardEntry[] = [];
    
    for (const player of players) {
      const score = await kvClient.get(`event:${eventId}:score:${player.id}`) as number || 0;
      const totalTime = await this.getPlayerTotalTime(eventId, player.id);
      
      leaderboard.push({
        rank: 0, // Will be set after sorting
        playerId: player.id,
        nickname: player.nickname,
        score,
        totalTimeMs: totalTime,
      });
    }
    
    // Sort by score (desc), then by total time (asc), then by joined time (asc)
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.totalTimeMs !== b.totalTimeMs) return a.totalTimeMs - b.totalTimeMs;
      return 0;
    });
    
    // Set ranks
    for (let i = 0; i < leaderboard.length; i++) {
      leaderboard[i].rank = i + 1;
    }
    
    return leaderboard.slice(0, limit);
  }

  // Time tracking
  async addPlayerTime(eventId: string, playerId: string, timeMs: number): Promise<void> {
    const ttl = await this.getTTL(eventId);
    await kvClient.incrby(`event:${eventId}:time:${playerId}`, timeMs);
    await kvClient.expire(`event:${eventId}:time:${playerId}`, ttl);
  }

  async getPlayerTotalTime(eventId: string, playerId: string): Promise<number> {
    const time = await kvClient.get(`event:${eventId}:time:${playerId}`);
    return time || 0;
  }

  // Streak tracking
  async updatePlayerStreak(eventId: string, playerId: string, isCorrect: boolean): Promise<number> {
    const ttl = await this.getTTL(eventId);
    const streakKey = `event:${eventId}:streak:${playerId}`;
    
    if (isCorrect) {
      await kvClient.incr(streakKey);
    } else {
      await kvClient.set(streakKey, 0);
    }
    
    await kvClient.expire(streakKey, ttl);
    const streak = await kvClient.get(streakKey);
    return streak || 0;
  }

  async getPlayerStreak(eventId: string, playerId: string): Promise<number> {
    const streak = await kvClient.get(`event:${eventId}:streak:${playerId}`);
    return streak || 0;
  }

  // Speed tracking
  async recordAnswerSpeed(eventId: string, questionId: string, playerId: string, timestamp: number): Promise<void> {
    const ttl = await this.getTTL(eventId);
    const key = `event:${eventId}:speed:${questionId}:${playerId}`;
    await kvClient.setex(key, ttl, timestamp);
  }

  async getFastestAnswers(eventId: string, questionId: string, limit: number = 3): Promise<Array<{playerId: string, timeMs: number}>> {
    const players = await this.getPlayers(eventId);
    const fastest: Array<{playerId: string, timeMs: number}> = [];
    
    for (const player of players) {
      const timestamp = await kvClient.get(`event:${eventId}:speed:${questionId}:${player.id}`) as number;
      if (timestamp) {
        fastest.push({
          playerId: player.id,
          timeMs: timestamp,
        });
      }
    }
    
    // Sort by timestamp (ascending = faster)
    fastest.sort((a, b) => a.timeMs - b.timeMs);
    
    return fastest.slice(0, limit);
  }

  // Statistics
  async getQuestionStats(eventId: string, questionId: string): Promise<{correctRate: number, totalAnswers: number}> {
    const answers = await this.getQuestionAnswers(eventId, questionId);
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    
    return {
      correctRate: totalAnswers > 0 ? correctAnswers / totalAnswers : 0,
      totalAnswers,
    };
  }

  // Utility methods
  private async getTTL(eventId: string): Promise<number> {
    const config = await kvClient.get(`event:${eventId}:config`) as EventConfig;
    return config?.ttlSeconds || 86400; // Default 24 hours
  }

  async cleanup(eventId: string): Promise<void> {
    // In a real implementation, you would need to scan and delete all keys
    // For now, relying on TTL for automatic cleanup
  }
}