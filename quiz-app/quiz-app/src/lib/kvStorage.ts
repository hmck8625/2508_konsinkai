/* eslint-disable @typescript-eslint/no-explicit-any */
import { kv } from '@vercel/kv';
import { createClient } from 'redis';

interface StorageData {
  gameStates: { [eventId: string]: any };
  participants: { [eventId: string]: any[] };
  answers: { [key: string]: any[] };
}

class KVStorage {
  private isKVAvailable: boolean;
  private localCache: StorageData;
  private useRedis: boolean;
  private redisClient: any;
  
  constructor() {
    this.useRedis = false;
    
    // REDIS_URLがある場合、Redis Cloudクライアントを使用
    if (process.env.REDIS_URL && !process.env.KV_REST_API_URL) {
      console.log(`🔧 DEBUG: Using Redis Cloud client with REDIS_URL`);
      this.useRedis = true;
      this.redisClient = createClient({
        url: process.env.REDIS_URL
      });
      
      // Redis接続エラーハンドリング
      this.redisClient.on('error', (err: any) => {
        console.error('Redis Client Error:', err);
        this.useRedis = false; // エラー時はローカルフォールバック
      });
      
      // Redis接続を確立
      this.redisClient.connect().catch((err: any) => {
        console.error('Redis Connection Error:', err);
        this.useRedis = false;
      });
      
      this.isKVAvailable = true; // Redisが利用可能
    } else {
      // KV環境変数の存在確認 (従来形式とMarketplace形式の両方をサポート)
      const hasKVUrl = !!(process.env.KV_REST_API_URL);
      const hasKVToken = !!(process.env.KV_REST_API_TOKEN);
      this.isKVAvailable = hasKVUrl && hasKVToken;
    }
    
    this.localCache = {
      gameStates: {},
      participants: {},
      answers: {},
    };
    
    // 詳細なデバッグ情報
    console.log(`🗄️ STORAGE: ${this.isKVAvailable ? 'Vercel KV (Redis)' : 'Local fallback'} mode`);
    console.log(`🔍 DEBUG: KV_REST_API_URL exists: ${!!process.env.KV_REST_API_URL}`);
    console.log(`🔍 DEBUG: KV_REST_API_TOKEN exists: ${!!process.env.KV_REST_API_TOKEN}`);
    console.log(`🔍 DEBUG: REDIS_URL exists: ${!!process.env.REDIS_URL}`);
    
    if (process.env.KV_REST_API_URL) {
      console.log(`🔍 DEBUG: Using KV_REST_API_URL: ${process.env.KV_REST_API_URL.substring(0, 30)}...`);
    } else if (process.env.REDIS_URL) {
      console.log(`🔍 DEBUG: Using REDIS_URL: ${process.env.REDIS_URL.substring(0, 30)}...`);
    }
    
    if (!this.isKVAvailable) {
      console.log(`⚠️  WARNING: KV not available, using local cache only`);
    }
  }

  async getParticipants(eventId: string): Promise<any[]> {
    if (this.isKVAvailable) {
      try {
        const key = `participants:${eventId}`;
        console.log(`🔍 DEBUG: Attempting ${this.useRedis ? 'Redis' : 'KV'} GET for key: ${key}`);
        
        let data;
        if (this.useRedis && this.redisClient.isOpen) {
          const rawData = await this.redisClient.get(key);
          data = rawData ? JSON.parse(rawData) : null;
        } else {
          data = await kv.get<any[]>(key);
        }
        
        const participants = data || [];
        console.log(`🔵 ${this.useRedis ? 'Redis' : 'KV'} GET ${key}: ${participants.length} participants`);
        return participants;
      } catch (error) {
        console.error(`❌ ${this.useRedis ? 'Redis' : 'KV'} GET ERROR for ${eventId}:`, error);
        console.log(`🔄 FALLBACK: Using local cache for ${eventId}`);
        return this.localCache.participants[eventId] || [];
      }
    }
    return this.localCache.participants[eventId] || [];
  }

  async setParticipants(eventId: string, participants: any[]): Promise<void> {
    this.localCache.participants[eventId] = participants;
    
    if (this.isKVAvailable) {
      try {
        const key = `participants:${eventId}`;
        console.log(`🔍 DEBUG: Attempting ${this.useRedis ? 'Redis' : 'KV'} SET for key: ${key}`);
        
        if (this.useRedis && this.redisClient.isOpen) {
          await this.redisClient.setEx(key, 86400, JSON.stringify(participants)); // 24時間のTTL
        } else {
          await kv.set(key, participants, {
            ex: 86400 // 24時間のTTL
          });
        }
        
        console.log(`🔴 ${this.useRedis ? 'Redis' : 'KV'} SET ${key}: ${participants.length} participants SUCCESSFUL`);
      } catch (error) {
        console.error(`❌ ${this.useRedis ? 'Redis' : 'KV'} SET ERROR for ${eventId}:`, error);
        console.log(`🔄 FALLBACK: Data saved to local cache only`);
      }
    }
  }

  async getGameState(eventId: string): Promise<any> {
    if (this.isKVAvailable) {
      try {
        const key = `gameState:${eventId}`;
        let state;
        if (this.useRedis && this.redisClient.isOpen) {
          const rawData = await this.redisClient.get(key);
          state = rawData ? JSON.parse(rawData) : null;
        } else {
          state = await kv.get<any>(key);
        }
        console.log(`🔵 ${this.useRedis ? 'Redis' : 'KV'} GET ${key}: ${state?.status || 'null'}`);
        return state;
      } catch (error) {
        console.error(`${this.useRedis ? 'Redis' : 'KV'} GET error:`, error);
        return this.localCache.gameStates[eventId] || null;
      }
    }
    return this.localCache.gameStates[eventId] || null;
  }

  async setGameState(eventId: string, state: any): Promise<void> {
    this.localCache.gameStates[eventId] = state;
    
    if (this.isKVAvailable) {
      try {
        const key = `gameState:${eventId}`;
        if (this.useRedis && this.redisClient.isOpen) {
          await this.redisClient.setEx(key, 86400, JSON.stringify(state));
        } else {
          await kv.set(key, state, {
            ex: 86400 // 24時間のTTL
          });
        }
        console.log(`🔴 ${this.useRedis ? 'Redis' : 'KV'} SET ${key}: ${state?.status || 'null'}`);
      } catch (error) {
        console.error(`${this.useRedis ? 'Redis' : 'KV'} SET error:`, error);
      }
    }
  }

  async getAnswers(key: string): Promise<any[]> {
    if (this.isKVAvailable) {
      try {
        const kvKey = `answers:${key}`;
        let data;
        if (this.useRedis && this.redisClient.isOpen) {
          const rawData = await this.redisClient.get(kvKey);
          data = rawData ? JSON.parse(rawData) : null;
        } else {
          data = await kv.get<any[]>(kvKey);
        }
        return data || [];
      } catch (error) {
        console.error(`${this.useRedis ? 'Redis' : 'KV'} GET error:`, error);
        return this.localCache.answers[key] || [];
      }
    }
    return this.localCache.answers[key] || [];
  }

  async setAnswers(key: string, answers: any[]): Promise<void> {
    this.localCache.answers[key] = answers;
    
    if (this.isKVAvailable) {
      try {
        const kvKey = `answers:${key}`;
        if (this.useRedis && this.redisClient.isOpen) {
          await this.redisClient.setEx(kvKey, 86400, JSON.stringify(answers));
        } else {
          await kv.set(kvKey, answers, {
            ex: 86400 // 24時間のTTL
          });
        }
      } catch (error) {
        console.error(`${this.useRedis ? 'Redis' : 'KV'} SET error:`, error);
      }
    }
  }

  // デバッグ用: KVの全キーを確認
  async debugListKeys(): Promise<string[]> {
    if (this.isKVAvailable) {
      try {
        let keys;
        if (this.useRedis && this.redisClient.isOpen) {
          keys = await this.redisClient.keys('*');
        } else {
          keys = await kv.keys('*');
        }
        console.log(`🔍 ${this.useRedis ? 'Redis' : 'KV'} Keys:`, keys);
        return keys;
      } catch (error) {
        console.error(`${this.useRedis ? 'Redis' : 'KV'} KEYS error:`, error);
      }
    }
    return [];
  }
}

export const kvStorage = new KVStorage();