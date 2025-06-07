import { useQuery, useMutation, useQueryClient } from 'react-query';
import { promptService, GetPromptsParams } from '../services/promptService';
import { CreatePromptData, CreateRatingData } from '../types';
import toast from 'react-hot-toast';

// プロンプト一覧取得フック
export const usePrompts = (params: GetPromptsParams = {}) => {
  return useQuery(
    ['prompts', params],
    () => promptService.getPrompts(params),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    }
  );
};

// プロンプト詳細取得フック
export const usePrompt = (id: string) => {
  return useQuery(
    ['prompt', id],
    () => promptService.getPrompt(id),
    {
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2分間キャッシュ
    }
  );
};

// プロンプト作成フック
export const useCreatePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (data: CreatePromptData) => promptService.createPrompt(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['prompts']);
        toast.success('プロンプトを作成しました');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'プロンプトの作成に失敗しました');
      },
    }
  );
};

// プロンプト更新フック
export const useUpdatePrompt = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation(
    (data: Partial<CreatePromptData>) => promptService.updatePrompt(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['prompts']);
        queryClient.invalidateQueries(['prompt', id]);
        toast.success('プロンプトを更新しました');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'プロンプトの更新に失敗しました');
      },
    }
  );
};

// プロンプト削除フック
export const useDeletePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (id: string) => promptService.deletePrompt(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['prompts']);
        toast.success('プロンプトを削除しました');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'プロンプトの削除に失敗しました');
      },
    }
  );
};

// プロンプト評価フック
export const useRatePrompt = (promptId: string) => {
  const queryClient = useQueryClient();

  return useMutation(
    (rating: CreateRatingData) => promptService.ratePrompt(promptId, rating),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['prompt', promptId]);
        queryClient.invalidateQueries(['prompts']);
        toast.success('評価を投稿しました');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || '評価の投稿に失敗しました');
      },
    }
  );
};

// コメント追加フック
export const useAddComment = (promptId: string) => {
  const queryClient = useQueryClient();

  return useMutation(
    (content: string) => promptService.addComment(promptId, content),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['prompt', promptId]);
        toast.success('コメントを投稿しました');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'コメントの投稿に失敗しました');
      },
    }
  );
};

// 使用ログ記録フック
export const useLogUsage = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ id, data }: { 
      id: string; 
      data: { 
        executionType: 'PREVIEW' | 'COPY' | 'SEND' | 'TEMPLATE'; 
        timeSaved?: number; 
      } 
    }) => promptService.logUsage(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['prompt', variables.id]);
        queryClient.invalidateQueries(['prompts']);
      },
      onError: (error: any) => {
        console.error('Usage logging failed:', error);
        // 使用ログの記録失敗は通知しない（ユーザー体験を阻害しないため）
      },
    }
  );
};

// カテゴリ別プロンプト数取得フック
export const useCategoryCounts = () => {
  return useQuery(
    ['categoryCounts'],
    () => promptService.getCategoryCounts(),
    {
      staleTime: 10 * 60 * 1000, // 10分間キャッシュ
    }
  );
};

// ユーザーのプロンプト取得フック
export const useUserPrompts = (userId: string, params: GetPromptsParams = {}) => {
  return useQuery(
    ['userPrompts', userId, params],
    () => promptService.getUserPrompts(userId, params),
    {
      enabled: !!userId,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );
};

// お気に入りプロンプト取得フック
export const useFavoritePrompts = (params: GetPromptsParams = {}) => {
  return useQuery(
    ['favoritePrompts', params],
    () => promptService.getFavoritePrompts(params),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );
};

// お気に入り追加/削除フック
export const useFavoriteToggle = () => {
  const queryClient = useQueryClient();

  const addToFavorites = useMutation(
    (promptId: string) => promptService.addToFavorites(promptId),
    {
      onSuccess: (_, promptId) => {
        queryClient.invalidateQueries(['prompt', promptId]);
        queryClient.invalidateQueries(['favoritePrompts']);
        toast.success('お気に入りに追加しました');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'お気に入りの追加に失敗しました');
      },
    }
  );

  const removeFromFavorites = useMutation(
    (promptId: string) => promptService.removeFromFavorites(promptId),
    {
      onSuccess: (_, promptId) => {
        queryClient.invalidateQueries(['prompt', promptId]);
        queryClient.invalidateQueries(['favoritePrompts']);
        toast.success('お気に入りから削除しました');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'お気に入りの削除に失敗しました');
      },
    }
  );

  return {
    addToFavorites,
    removeFromFavorites,
  };
};

// プロンプト統計情報取得フック
export const usePromptStats = (id: string) => {
  return useQuery(
    ['promptStats', id],
    () => promptService.getPromptStats(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    }
  );
};