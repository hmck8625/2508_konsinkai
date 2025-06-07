import api from './api';
import { 
  Prompt, 
  CreatePromptData, 
  CreateRatingData, 
  Rating,
  Comment,
  PaginatedResponse
} from '../types';

export interface GetPromptsParams {
  category?: string;
  difficulty?: string;
  visibility?: string;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

export const promptService = {
  // プロンプト一覧取得
  async getPrompts(params: GetPromptsParams = {}): Promise<{
    prompts: Prompt[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const response = await api.get('/prompts', { params });
    return response.data;
  },

  // プロンプト詳細取得
  async getPrompt(id: string): Promise<Prompt> {
    const response = await api.get(`/prompts/${id}`);
    return response.data.prompt;
  },

  // プロンプト作成
  async createPrompt(data: CreatePromptData): Promise<Prompt> {
    const response = await api.post('/prompts', data);
    return response.data.prompt;
  },

  // プロンプト更新
  async updatePrompt(id: string, data: Partial<CreatePromptData>): Promise<Prompt> {
    const response = await api.put(`/prompts/${id}`, data);
    return response.data.prompt;
  },

  // プロンプト削除
  async deletePrompt(id: string): Promise<void> {
    await api.delete(`/prompts/${id}`);
  },

  // プロンプト評価
  async ratePrompt(id: string, rating: CreateRatingData): Promise<{
    rating: Rating;
    updatedAverage: number;
  }> {
    const response = await api.post(`/prompts/${id}/ratings`, rating);
    return response.data;
  },

  // コメント追加
  async addComment(id: string, content: string): Promise<Comment> {
    const response = await api.post(`/prompts/${id}/comments`, { content });
    return response.data.comment;
  },

  // 使用ログ記録
  async logUsage(id: string, data: {
    executionType: 'PREVIEW' | 'COPY' | 'SEND' | 'TEMPLATE';
    timeSaved?: number;
  }): Promise<void> {
    await api.post(`/prompts/${id}/usage`, data);
  },

  // カテゴリ別プロンプト数取得
  async getCategoryCounts(): Promise<Record<string, number>> {
    const response = await api.get('/prompts/categories/counts');
    return response.data;
  },

  // ユーザーのプロンプト取得
  async getUserPrompts(userId: string, params: GetPromptsParams = {}): Promise<{
    prompts: Prompt[];
    pagination: any;
  }> {
    const response = await api.get(`/prompts/user/${userId}`, { params });
    return response.data;
  },

  // お気に入りプロンプト取得
  async getFavoritePrompts(params: GetPromptsParams = {}): Promise<{
    prompts: Prompt[];
    pagination: any;
  }> {
    const response = await api.get('/prompts/favorites', { params });
    return response.data;
  },

  // プロンプトをお気に入りに追加
  async addToFavorites(promptId: string): Promise<void> {
    await api.post(`/prompts/${promptId}/favorite`);
  },

  // プロンプトをお気に入りから削除
  async removeFromFavorites(promptId: string): Promise<void> {
    await api.delete(`/prompts/${promptId}/favorite`);
  },

  // プロンプトの統計情報取得
  async getPromptStats(id: string): Promise<{
    totalUsage: number;
    avgRating: number;
    totalRatings: number;
    recentUsage: Array<{ date: string; count: number }>;
  }> {
    const response = await api.get(`/prompts/${id}/stats`);
    return response.data;
  }
};