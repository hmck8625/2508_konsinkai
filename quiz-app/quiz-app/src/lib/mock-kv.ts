// 開発用モックKVサービス（Vercel KVがない場合のテスト用）

interface MockStore {
  [key: string]: any;
}

class MockKVService {
  private store: MockStore = {};
  private timers: Map<string, NodeJS.Timeout> = new Map();

  async get(key: string): Promise<any> {
    return this.store[key] || null;
  }

  async set(key: string, value: any): Promise<string> {
    this.store[key] = value;
    return 'OK';
  }

  async setex(key: string, ttl: number, value: any): Promise<string> {
    this.store[key] = value;
    
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set expiration timer
    const timer = setTimeout(() => {
      delete this.store[key];
      this.timers.delete(key);
    }, ttl * 1000);
    
    this.timers.set(key, timer);
    
    return 'OK';
  }

  async sadd(key: string, member: string): Promise<number> {
    if (!this.store[key]) {
      this.store[key] = new Set();
    }
    const prevSize = this.store[key].size;
    this.store[key].add(member);
    return this.store[key].size - prevSize;
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.store[key] || !(this.store[key] instanceof Set)) {
      return [];
    }
    return Array.from(this.store[key]);
  }

  async incr(key: string): Promise<number> {
    const current = this.store[key] || 0;
    this.store[key] = current + 1;
    return this.store[key];
  }

  async incrby(key: string, increment: number): Promise<number> {
    const current = this.store[key] || 0;
    this.store[key] = current + increment;
    return this.store[key];
  }

  async expire(key: string, ttl: number): Promise<number> {
    if (!(key in this.store)) {
      return 0;
    }
    
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set expiration timer
    const timer = setTimeout(() => {
      delete this.store[key];
      this.timers.delete(key);
    }, ttl * 1000);
    
    this.timers.set(key, timer);
    
    return 1;
  }

  // デバッグ用：全データを表示
  debug(): MockStore {
    return { ...this.store };
  }

  // 全データをクリア
  clear(): void {
    this.store = {};
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

// シングルトンインスタンス
let mockKV: MockKVService | null = null;

export function getMockKV(): MockKVService {
  if (!mockKV) {
    mockKV = new MockKVService();
  }
  return mockKV;
}

// Vercel KV互換のインターフェース
export const mockKv = {
  get: (key: string) => getMockKV().get(key),
  set: (key: string, value: any, options?: any) => {
    if (options?.nx) {
      const existing = getMockKV().get(key);
      if (existing) return null;
    }
    if (options?.ex) {
      return getMockKV().setex(key, options.ex, value);
    }
    return getMockKV().set(key, value);
  },
  setex: (key: string, ttl: number, value: any) => getMockKV().setex(key, ttl, value),
  sadd: (key: string, member: string) => getMockKV().sadd(key, member),
  smembers: (key: string) => getMockKV().smembers(key),
  incr: (key: string) => getMockKV().incr(key),
  incrby: (key: string, increment: number) => getMockKV().incrby(key, increment),
  expire: (key: string, ttl: number) => getMockKV().expire(key, ttl),
};