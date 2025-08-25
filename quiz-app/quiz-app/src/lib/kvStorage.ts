/* eslint-disable @typescript-eslint/no-explicit-any */
import { kv } from '@vercel/kv';

interface StorageData {
  gameStates: { [eventId: string]: any };
  participants: { [eventId: string]: any[] };
  answers: { [key: string]: any[] };
}

class KVStorage {
  private isKVAvailable: boolean;
  private localCache: StorageData;
  
  constructor() {
    // KV環境変数の存在確認 (従来形式とMarketplace形式の両方をサポート)
    const hasKVUrl = !!(process.env.KV_REST_API_URL || process.env.REDIS_URL);
    const hasKVToken = !!(process.env.KV_REST_API_TOKEN || process.env.REDIS_URL); // REDIS_URLはトークンも含む
    this.isKVAvailable = hasKVUrl && hasKVToken;
    
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
        console.log(`🔍 DEBUG: Attempting KV GET for key: ${key}`);
        const data = await kv.get<any[]>(key);
        const participants = data || [];
        console.log(`🔵 KV GET ${key}: ${participants.length} participants`);
        console.log(`🔵 KV GET data:`, JSON.stringify(participants, null, 2));
        return participants;
      } catch (error) {
        console.error(`❌ KV GET ERROR for ${eventId}:`, error);
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
        console.log(`🔍 DEBUG: Attempting KV SET for key: ${key}`);
        await kv.set(key, participants, {
          ex: 86400 // 24時間のTTL
        });
        console.log(`🔴 KV SET ${key}: ${participants.length} participants SUCCESSFUL`);
      } catch (error) {
        console.error(`❌ KV SET ERROR for ${eventId}:`, error);
        console.log(`🔄 FALLBACK: Data saved to local cache only`);
      }
    }
  }

  async getGameState(eventId: string): Promise<any> {
    if (this.isKVAvailable) {
      try {
        const key = `gameState:${eventId}`;
        const state = await kv.get<any>(key);
        console.log(`🔵 KV GET ${key}: ${state?.status || 'null'}`);
        return state;
      } catch (error) {
        console.error('KV GET error:', error);
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
        await kv.set(key, state, {
          ex: 86400 // 24時間のTTL
        });
        console.log(`🔴 KV SET ${key}: ${state?.status || 'null'}`);
      } catch (error) {
        console.error('KV SET error:', error);
      }
    }
  }

  async getAnswers(key: string): Promise<any[]> {
    if (this.isKVAvailable) {
      try {
        const kvKey = `answers:${key}`;
        const data = await kv.get<any[]>(kvKey);
        return data || [];
      } catch (error) {
        console.error('KV GET error:', error);
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
        await kv.set(kvKey, answers, {
          ex: 86400 // 24時間のTTL
        });
      } catch (error) {
        console.error('KV SET error:', error);
      }
    }
  }

  // デバッグ用: KVの全キーを確認
  async debugListKeys(): Promise<string[]> {
    if (this.isKVAvailable) {
      try {
        const keys = await kv.keys('*');
        console.log('🔍 KV Keys:', keys);
        return keys;
      } catch (error) {
        console.error('KV KEYS error:', error);
      }
    }
    return [];
  }
}

export const kvStorage = new KVStorage();