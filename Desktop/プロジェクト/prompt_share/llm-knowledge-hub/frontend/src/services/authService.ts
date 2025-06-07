import api from './api';
import { User, AuthResponse } from '../types';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  department: string;
  role: string;
  password: string;
}

export const authService = {
  // ログイン
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    const { accessToken, refreshToken, user } = response.data;
    
    // トークンをローカルストレージに保存
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  // ユーザー登録
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    const { accessToken, refreshToken, user } = response.data;
    
    // トークンをローカルストレージに保存
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  // ログアウト
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // エラーが発生してもローカルストレージはクリア
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  // プロフィール取得
  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile');
    return response.data.user;
  },

  // プロフィール更新
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put('/auth/profile', data);
    const updatedUser = response.data.user;
    
    // ローカルストレージのユーザー情報も更新
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return updatedUser;
  },

  // 拡張機能トークン生成
  async generateExtensionToken(): Promise<{ token: string; expiresAt: string }> {
    const response = await api.post('/auth/extension-token');
    return {
      token: response.data.token,
      expiresAt: response.data.expiresAt
    };
  },

  // トークンの有効性チェック
  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken');
    return !!token;
  },

  // 現在のユーザー情報取得
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // トークン取得
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  },

  // リフレッシュトークン取得
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }
};