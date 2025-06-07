import api from './api';
import { SearchFilters, SearchResult, Suggestion, Prompt } from '../types';

export const searchService = {
  // プロンプト検索
  async searchPrompts(filters: SearchFilters): Promise<SearchResult> {
    const response = await api.get('/search/prompts', { params: filters });
    return response.data;
  },

  // 検索候補取得
  async getSuggestions(query: string, limit: number = 5): Promise<{ suggestions: Suggestion[] }> {
    const response = await api.get('/search/suggestions', { 
      params: { q: query, limit } 
    });
    return response.data;
  },

  // 類似プロンプト取得
  async getSimilarPrompts(id: string, limit: number = 5): Promise<{
    similarPrompts: Prompt[];
    originalPrompt: {
      id: string;
      title: string;
      category: string;
    };
  }> {
    const response = await api.get(`/search/similar/${id}`, { 
      params: { limit } 
    });
    return response.data;
  },

  // レコメンデーション取得
  async getRecommendations(type: 'personalized' | 'trending' | 'collaborative' = 'personalized', limit: number = 10): Promise<{
    recommendations: Array<Prompt & {
      reason: string;
      confidence: number;
    }>;
  }> {
    const response = await api.get('/search/recommendations', { 
      params: { type, limit } 
    });
    return response.data;
  },

  // 高度な検索（複数条件）
  async advancedSearch(params: {
    query?: string;
    categories?: string[];
    departments?: string[];
    difficulty?: string[];
    ratingMin?: number;
    dateFrom?: string;
    dateTo?: string;
    author?: string;
    tags?: string[];
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<SearchResult> {
    const response = await api.get('/search/advanced', { params });
    return response.data;
  },

  // 人気の検索キーワード取得
  async getPopularKeywords(limit: number = 20): Promise<{
    keywords: Array<{
      keyword: string;
      count: number;
    }>;
  }> {
    const response = await api.get('/search/popular-keywords', { 
      params: { limit } 
    });
    return response.data;
  },

  // 最近の検索履歴取得
  async getSearchHistory(limit: number = 10): Promise<{
    history: Array<{
      query: string;
      timestamp: string;
      resultCount: number;
    }>;
  }> {
    const response = await api.get('/search/history', { 
      params: { limit } 
    });
    return response.data;
  },

  // 検索履歴削除
  async clearSearchHistory(): Promise<void> {
    await api.delete('/search/history');
  },

  // 保存された検索条件取得
  async getSavedSearches(): Promise<{
    searches: Array<{
      id: string;
      name: string;
      filters: SearchFilters;
      createdAt: string;
    }>;
  }> {
    const response = await api.get('/search/saved');
    return response.data;
  },

  // 検索条件保存
  async saveSearch(name: string, filters: SearchFilters): Promise<{
    id: string;
    name: string;
    filters: SearchFilters;
  }> {
    const response = await api.post('/search/save', { name, filters });
    return response.data;
  },

  // 保存された検索条件削除
  async deleteSavedSearch(id: string): Promise<void> {
    await api.delete(`/search/saved/${id}`);
  }
};