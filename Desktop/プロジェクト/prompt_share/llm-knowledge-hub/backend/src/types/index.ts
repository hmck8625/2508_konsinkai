// User types
export interface User {
  id: string;
  email: string;
  name: string;
  department: string;
  role: 'admin' | 'manager' | 'user';
  created_at: Date;
  updated_at: Date;
}

// Prompt types
export interface Prompt {
  id: string;
  user_id: string;
  title: string;
  content: string;
  response?: string;
  llm_model?: string;
  category: string;
  subcategory?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  quality_score?: number;
  visibility: 'public' | 'department' | 'private';
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

// Chrome extension data format
export interface ConversationData {
  session_id: string;
  user_id: string;
  timestamp: string;
  platform: 'chatgpt' | 'claude' | 'copilot' | 'bard';
  model: string;
  conversation: {
    prompt: string;
    response: string;
    tokens_used: number;
    response_time: number;
  };
  context: {
    url: string;
    tab_title: string;
    user_department: string;
    detected_category: string;
  };
  metadata: {
    browser: string;
    extension_version: string;
    auto_tags: string[];
  };
}

// Rating types
export interface Rating {
  id: string;
  prompt_id: string;
  user_id: string;
  usefulness: number; // 1-5
  ease_of_use: number; // 1-5
  result_quality: number; // 1-5
  time_saved: number; // minutes
  comment?: string;
  created_at: Date;
}

// Template types
export interface Template {
  id: string;
  prompt_id: string;
  template_content: string;
  variables: Record<string, TemplateVariable>;
  usage_guide?: string;
  created_at: Date;
}

export interface TemplateVariable {
  type: 'text' | 'number' | 'select' | 'textarea';
  required: boolean;
  description: string;
  example?: string;
  options?: string[]; // for select type
  default?: string;
}

// Analytics types
export interface UsageMetrics {
  total_prompts_used: number;
  time_saved_total: number;
  favorite_categories: string[];
  efficiency_score: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Search and filter types
export interface SearchFilters {
  categories?: string[];
  departments?: string[];
  rating_min?: number;
  difficulty?: string[];
  date_range?: {
    from: string;
    to: string;
  };
  tags?: string[];
}

export interface SearchResult {
  prompt_id: string;
  title: string;
  snippet: string;
  category: string;
  subcategory?: string;
  author: string;
  department: string;
  rating: number;
  usage_count: number;
  created_at: string;
  tags: string[];
  relevance_score?: number;
}