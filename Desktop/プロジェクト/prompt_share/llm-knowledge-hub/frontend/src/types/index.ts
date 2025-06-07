// User types
export interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Prompt types
export interface Prompt {
  id: string;
  userId: string;
  title: string;
  content: string;
  response?: string;
  llmModel?: string;
  category: string;
  subcategory?: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  tags?: string[];
  qualityScore?: number;
  visibility: 'PUBLIC' | 'DEPARTMENT' | 'PRIVATE';
  usageCount: number;
  averageRating?: number;
  totalRatings: number;
  estimatedTokens?: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    department: string;
  };
  _count: {
    ratings: number;
    usageLogs: number;
    comments: number;
  };
}

export interface CreatePromptData {
  title: string;
  content: string;
  response?: string;
  llmModel?: string;
  category: string;
  subcategory?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  tags?: string[];
  visibility?: 'PUBLIC' | 'DEPARTMENT' | 'PRIVATE';
}

// Rating types
export interface Rating {
  id: string;
  promptId: string;
  userId: string;
  usefulness: number;
  easeOfUse: number;
  resultQuality: number;
  timeSaved?: number;
  comment?: string;
  improvements?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface CreateRatingData {
  usefulness: number;
  easeOfUse: number;
  resultQuality: number;
  timeSaved?: number;
  comment?: string;
  improvements?: string;
}

// Comment types
export interface Comment {
  id: string;
  promptId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
  };
}

// Search types
export interface SearchFilters {
  q?: string;
  categories?: string[];
  departments?: string[];
  difficulty?: ('BEGINNER' | 'INTERMEDIATE' | 'ADVANCED')[];
  rating_min?: number;
  date_from?: string;
  date_to?: string;
  sort?: 'relevance' | 'created_at' | 'rating' | 'usage_count';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  results: (Prompt & {
    snippet: string;
    matchReasons: string[];
  })[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  query: SearchFilters;
}

export interface Suggestion {
  type: 'prompt' | 'category';
  id?: string;
  text: string;
  category?: string;
}

// Template types
export interface Template {
  id: string;
  promptId: string;
  templateContent: string;
  variables: Record<string, any>;
  usageGuide?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Collection types
export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  prompts: Prompt[];
}

// Analytics types
export interface PersonalAnalytics {
  usage_metrics: {
    total_prompts_used: number;
    time_saved_total: number;
    favorite_categories: string[];
    efficiency_score: number;
  };
  activity_timeline: Array<{
    date: string;
    prompts_used: number;
    time_saved: number;
    categories: string[];
  }>;
  recommendations: Array<{
    prompt_id: string;
    title: string;
    reason: string;
  }>;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Error types
export interface ApiError {
  message: string;
  error?: string;
  errors?: string[];
  status?: number;
}

// Category types
export interface Category {
  value: string;
  label: string;
  subcategories?: Array<{
    value: string;
    label: string;
  }>;
}

export const CATEGORIES: Category[] = [
  {
    value: 'document_creation',
    label: '資料作成',
    subcategories: [
      { value: 'proposal', label: '提案書' },
      { value: 'report', label: '報告書' },
      { value: 'manual', label: 'マニュアル' },
      { value: 'presentation', label: 'プレゼン資料' }
    ]
  },
  {
    value: 'email_writing',
    label: 'メール作成',
    subcategories: [
      { value: 'internal', label: '社内連絡' },
      { value: 'customer', label: '顧客対応' },
      { value: 'vendor', label: '取引先対応' },
      { value: 'inquiry', label: '問い合わせ対応' }
    ]
  },
  {
    value: 'planning',
    label: '企画・戦略策定'
  },
  {
    value: 'analysis',
    label: 'データ分析・解釈'
  },
  {
    value: 'coding',
    label: 'プログラミング'
  },
  {
    value: 'translation',
    label: '翻訳・語学'
  },
  {
    value: 'research',
    label: '調査・情報収集'
  },
  {
    value: 'meeting',
    label: '会議・議事録'
  },
  {
    value: 'creative',
    label: 'クリエイティブ'
  },
  {
    value: 'other',
    label: 'その他'
  }
];

// Navigation types
export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

// Theme types
export interface ThemeMode {
  mode: 'light' | 'dark';
}