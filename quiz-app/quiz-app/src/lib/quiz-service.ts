import { KVService } from './kv';
import { v4 as uuidv4 } from 'uuid';
import { 
  Player, 
  Question, 
  Answer, 
  EventStatus, 
  GameState, 
  JoinRequest, 
  JoinResponse,
  AnswerRequest,
  AnswerResponse,
  EventConfig,
  QuestionStats
} from '@/types/quiz';

export class QuizService {
  private kvService: KVService;

  constructor() {
    this.kvService = KVService.getInstance();
  }

  async createEvent(code: string, title: string, config: EventConfig): Promise<string> {
    const eventId = code; // Using code as eventId for simplicity
    await this.kvService.createEvent(eventId, code, title, config);
    return eventId;
  }

  async joinEvent(request: JoinRequest): Promise<JoinResponse> {
    try {
      const event = await this.kvService.getEventByCode(request.eventCode);
      if (!event) {
        return { success: false, error: 'イベントが見つかりません' };
      }

      // Check if nickname exists and modify if needed
      const nickname = request.nickname.trim();
      if (!nickname) {
        return { success: false, error: 'ニックネームを入力してください' };
      }

      let finalNickname = nickname;
      let suffix = 2;
      while (await this.kvService.isNicknameExists(event.id, finalNickname)) {
        finalNickname = `${nickname}_${suffix}`;
        suffix++;
      }

      const player: Player = {
        id: uuidv4(),
        nickname: finalNickname,
        deviceId: request.deviceId,
        joinedAt: new Date().toISOString(),
        kicked: false,
      };

      await this.kvService.addPlayer(event.id, player);

      return {
        success: true,
        playerId: player.id,
        nickname: finalNickname,
      };
    } catch (error) {
      console.error('Error joining event:', error);
      return { success: false, error: 'サーバーエラーが発生しました' };
    }
  }

  async submitAnswer(request: AnswerRequest): Promise<AnswerResponse> {
    try {
      const status = await this.kvService.getEventStatus(request.eventId);
      if (!status || !status.endsWith('_open')) {
        return { success: false, accepted: false, error: '回答受付時間外です' };
      }

      const currentQuestionId = this.extractQuestionIdFromStatus(status);
      if (currentQuestionId !== request.questionId) {
        return { success: false, accepted: false, error: '無効な問題です' };
      }

      const question = await this.kvService.getQuestion(request.eventId, request.questionId);
      if (!question) {
        return { success: false, accepted: false, error: '問題が見つかりません' };
      }

      const isCorrect = request.choice === question.answerIndex;
      const timestamp = Date.now();

      // Calculate score
      let scoreDelta = 0;
      if (isCorrect) {
        scoreDelta = 100; // Base score

        // Speed bonus
        // const config = await this.kvService.getEventStatus(request.eventId);
        // TODO: Implement speed bonus calculation based on remaining time

        // Streak bonus
        const currentStreak = await this.kvService.getPlayerStreak(request.eventId, request.playerId);
        if (currentStreak >= 2) {
          if (currentStreak >= 4) {
            scoreDelta += 100; // 5 consecutive correct answers
          } else {
            scoreDelta += 50; // 3 consecutive correct answers
          }
        }
      }

      const answer: Answer = {
        playerId: request.playerId,
        choice: request.choice,
        timestamp,
        isCorrect,
        scoreDelta,
        answerValue: request.choice,
        damage: 0,
        isLastAnswerer: false,
      };

      const submitted = await this.kvService.submitAnswer(request.eventId, request.questionId, answer);
      if (!submitted) {
        return { success: false, accepted: false, error: '既に回答済みです' };
      }

      // Update scores and tracking
      if (scoreDelta > 0) {
        await this.kvService.updatePlayerScore(request.eventId, request.playerId, scoreDelta);
      }

      await this.kvService.updatePlayerStreak(request.eventId, request.playerId, isCorrect);
      await this.kvService.recordAnswerSpeed(request.eventId, request.questionId, request.playerId, timestamp);

      return {
        success: true,
        accepted: true,
        isCorrect,
        scoreDelta,
      };
    } catch (error) {
      console.error('Error submitting answer:', error);
      return { success: false, accepted: false, error: 'サーバーエラーが発生しました' };
    }
  }

  async getGameState(eventId: string): Promise<GameState | null> {
    try {
      const status = await this.kvService.getEventStatus(eventId);
      if (!status) return null;

      const leaderboard = await this.kvService.getLeaderboard(eventId, 10);
      
      let currentQuestion: Question | undefined;
      let questionStats: QuestionStats | undefined;

      if (status !== 'lobby' && status !== 'results') {
        const questionId = this.extractQuestionIdFromStatus(status);
        if (questionId) {
          currentQuestion = await this.kvService.getQuestion(eventId, questionId) || undefined;
          
          if (status.endsWith('_reveal')) {
            const stats = await this.kvService.getQuestionStats(eventId, questionId);
            const fastest = await this.kvService.getFastestAnswers(eventId, questionId, 3);
            
            // Get player names for fastest answers
            const fastestWithNames = await Promise.all(
              fastest.map(async (f) => {
                const player = await this.kvService.getPlayer(eventId, f.playerId);
                return {
                  playerId: f.playerId,
                  nickname: player?.nickname || 'Unknown',
                  timeMs: f.timeMs,
                };
              })
            );

            questionStats = {
              correctRate: stats.correctRate,
              totalAnswers: stats.totalAnswers,
              fastest: fastestWithNames,
            };
          }
        }
      }

      return {
        status,
        currentQuestion,
        serverTime: Date.now(),
        leaderboard,
        questionStats,
      };
    } catch (error) {
      console.error('Error getting game state:', error);
      return null;
    }
  }

  async setQuestion(eventId: string, questionId: string, question: Question): Promise<void> {
    await this.kvService.setQuestion(eventId, questionId, question);
  }

  async controlGame(eventId: string, action: string, questionId?: string): Promise<{success: boolean, status?: EventStatus, error?: string}> {
    try {
      const currentStatus = await this.kvService.getEventStatus(eventId);
      if (!currentStatus) {
        return { success: false, error: 'イベントが見つかりません' };
      }

      let newStatus: EventStatus;

      switch (action) {
        case 'open':
          if (!questionId) {
            return { success: false, error: '問題IDが必要です' };
          }
          newStatus = `Q${questionId}_open` as EventStatus;
          break;

        case 'close':
          if (!questionId) {
            return { success: false, error: '問題IDが必要です' };
          }
          newStatus = `Q${questionId}_closed` as EventStatus;
          break;

        case 'reveal':
          if (!questionId) {
            return { success: false, error: '問題IDが必要です' };
          }
          newStatus = `Q${questionId}_reveal` as EventStatus;
          break;

        case 'next':
          // Extract current question number and increment
          const currentQuestionId = this.extractQuestionIdFromStatus(currentStatus);
          if (currentQuestionId) {
            const nextQuestionNum = parseInt(currentQuestionId) + 1;
            newStatus = `Q${nextQuestionNum}_open`;
          } else {
            newStatus = 'Q1_open';
          }
          break;

        case 'results':
          newStatus = 'results';
          break;

        case 'reset':
          newStatus = 'lobby';
          break;

        default:
          return { success: false, error: '無効なアクションです' };
      }

      await this.kvService.setEventStatus(eventId, newStatus);
      return { success: true, status: newStatus };
    } catch (error) {
      console.error('Error controlling game:', error);
      return { success: false, error: 'サーバーエラーが発生しました' };
    }
  }

  async getPlayers(eventId: string): Promise<Player[]> {
    return await this.kvService.getPlayers(eventId);
  }

  async exportData(eventId: string): Promise<string> {
    try {
      // const players = await this.getPlayers(eventId);
      const leaderboard = await this.kvService.getLeaderboard(eventId, 100);
      
      // Create CSV content
      let csv = '順位,プレイヤーID,ニックネーム,スコア,合計時間(ms)\n';
      
      for (const entry of leaderboard) {
        csv += `${entry.rank},${entry.playerId},${entry.nickname},${entry.score},${entry.totalTimeMs}\n`;
      }
      
      return csv;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('データのエクスポートに失敗しました');
    }
  }

  private extractQuestionIdFromStatus(status: EventStatus): string | null {
    const match = status.match(/^Q(\d+)_/);
    return match ? match[1] : null;
  }
}