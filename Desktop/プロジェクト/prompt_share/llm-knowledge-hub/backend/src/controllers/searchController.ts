import { Request, Response } from 'express';
import { db } from '../utils/database';
import { AuthRequest } from '../middleware/auth';

export class SearchController {
  // プロンプト検索
  static async searchPrompts(req: AuthRequest, res: Response) {
    try {
      const {
        q, // 検索クエリ
        categories,
        departments,
        difficulty,
        rating_min,
        date_from,
        date_to,
        sort = 'relevance',
        limit = 20,
        offset = 0
      } = req.query;

      // 基本的な可視性フィルター
      const baseWhere: any = {
        OR: [
          { userId: req.user!.id },
          { visibility: 'PUBLIC' },
          { 
            visibility: 'DEPARTMENT',
            user: { department: req.user!.department }
          }
        ]
      };

      // 検索条件を構築
      const where: any = { AND: [baseWhere] };

      // テキスト検索
      if (q && typeof q === 'string') {
        where.AND.push({
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
            { tags: { array_contains: [q] } }
          ]
        });
      }

      // カテゴリフィルター
      if (categories && Array.isArray(categories)) {
        where.AND.push({
          category: { in: categories }
        });
      }

      // 部門フィルター
      if (departments && Array.isArray(departments)) {
        where.AND.push({
          user: {
            department: { in: departments }
          }
        });
      }

      // 難易度フィルター
      if (difficulty && Array.isArray(difficulty)) {
        where.AND.push({
          difficulty: { in: difficulty }
        });
      }

      // 評価フィルター
      if (rating_min) {
        where.AND.push({
          averageRating: { gte: Number(rating_min) }
        });
      }

      // 日付フィルター
      if (date_from || date_to) {
        const dateFilter: any = {};
        if (date_from) dateFilter.gte = new Date(date_from as string);
        if (date_to) dateFilter.lte = new Date(date_to as string);
        where.AND.push({
          createdAt: dateFilter
        });
      }

      // ソート順の決定
      let orderBy: any = {};
      switch (sort) {
        case 'created_at':
          orderBy = { createdAt: 'desc' };
          break;
        case 'rating':
          orderBy = { averageRating: 'desc' };
          break;
        case 'usage_count':
          orderBy = { usageCount: 'desc' };
          break;
        case 'relevance':
        default:
          // テキスト検索がある場合は関連度、ない場合は作成日順
          orderBy = q ? { usageCount: 'desc' } : { createdAt: 'desc' };
          break;
      }

      const prompts = await db.prompt.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              department: true
            }
          },
          _count: {
            select: {
              ratings: true,
              usageLogs: true,
              comments: true
            }
          }
        },
        orderBy,
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await db.prompt.count({ where });

      // 検索結果にスニペットを追加
      const results = prompts.map(prompt => ({
        ...prompt,
        snippet: SearchController.generateSnippet(prompt.content, q as string),
        matchReasons: SearchController.getMatchReasons(prompt, q as string)
      }));

      res.json({
        results,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: total > Number(offset) + Number(limit)
        },
        query: {
          q,
          categories,
          departments,
          difficulty,
          rating_min,
          date_from,
          date_to,
          sort
        }
      });
    } catch (error) {
      console.error('Search prompts error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 検索候補取得
  static async getSuggestions(req: AuthRequest, res: Response) {
    try {
      const { q, limit = 5 } = req.query;

      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json({ suggestions: [] });
      }

      // タイトルマッチ
      const titleMatches = await db.prompt.findMany({
        where: {
          AND: [
            {
              OR: [
                { userId: req.user!.id },
                { visibility: 'PUBLIC' },
                { 
                  visibility: 'DEPARTMENT',
                  user: { department: req.user!.department }
                }
              ]
            },
            {
              title: {
                contains: q,
                mode: 'insensitive'
              }
            }
          ]
        },
        select: {
          id: true,
          title: true,
          category: true
        },
        take: Number(limit)
      });

      // カテゴリマッチ
      const categories = await db.prompt.groupBy({
        by: ['category'],
        where: {
          AND: [
            {
              OR: [
                { userId: req.user!.id },
                { visibility: 'PUBLIC' },
                { 
                  visibility: 'DEPARTMENT',
                  user: { department: req.user!.department }
                }
              ]
            },
            {
              category: {
                contains: q,
                mode: 'insensitive'
              }
            }
          ]
        },
        take: 3
      });

      const suggestions = [
        ...titleMatches.map(p => ({
          type: 'prompt',
          id: p.id,
          text: p.title,
          category: p.category
        })),
        ...categories.map(c => ({
          type: 'category',
          text: c.category
        }))
      ];

      res.json({ suggestions: suggestions.slice(0, Number(limit)) });
    } catch (error) {
      console.error('Get suggestions error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 類似プロンプト検索
  static async getSimilarPrompts(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { limit = 5 } = req.query;

      // 元のプロンプトを取得
      const originalPrompt = await db.prompt.findUnique({
        where: { id }
      });

      if (!originalPrompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }

      // 類似プロンプトを検索（同じカテゴリ、タグ、キーワード）
      const similarPrompts = await db.prompt.findMany({
        where: {
          AND: [
            { id: { not: id } }, // 自分自身を除外
            {
              OR: [
                { userId: req.user!.id },
                { visibility: 'PUBLIC' },
                { 
                  visibility: 'DEPARTMENT',
                  user: { department: req.user!.department }
                }
              ]
            },
            {
              OR: [
                { category: originalPrompt.category },
                // タグが一致する場合（JSONBの配列操作）
                { tags: { path: '$', array_contains: originalPrompt.tags } }
              ]
            }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              department: true
            }
          },
          _count: {
            select: {
              ratings: true,
              usageLogs: true
            }
          }
        },
        orderBy: [
          { averageRating: 'desc' },
          { usageCount: 'desc' }
        ],
        take: Number(limit)
      });

      res.json({
        similarPrompts,
        originalPrompt: {
          id: originalPrompt.id,
          title: originalPrompt.title,
          category: originalPrompt.category
        }
      });
    } catch (error) {
      console.error('Get similar prompts error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // レコメンデーション取得
  static async getRecommendations(req: AuthRequest, res: Response) {
    try {
      const { type = 'personalized', limit = 10 } = req.query;

      let recommendations: any[] = [];

      switch (type) {
        case 'trending':
          // 最近人気のプロンプト
          recommendations = await SearchController.getTrendingPrompts(req.user!.id, Number(limit));
          break;
        case 'collaborative':
          // 協調フィルタリング
          recommendations = await SearchController.getCollaborativeRecommendations(req.user!.id, Number(limit));
          break;
        case 'personalized':
        default:
          // パーソナライズド推奨
          recommendations = await SearchController.getPersonalizedRecommendations(req.user!.id, Number(limit));
          break;
      }

      res.json({
        recommendations: recommendations.map(prompt => ({
          ...prompt,
          reason: SearchController.getRecommendationReason(prompt, type as string),
          confidence: SearchController.calculateConfidence(prompt, req.user!)
        }))
      });
    } catch (error) {
      console.error('Get recommendations error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // ヘルパーメソッド
  private static generateSnippet(content: string, query: string | undefined): string {
    if (!query) return content.substring(0, 150) + '...';

    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const index = contentLower.indexOf(queryLower);

    if (index === -1) {
      return content.substring(0, 150) + '...';
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    const snippet = content.substring(start, end);

    return (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : '');
  }

  private static getMatchReasons(prompt: any, query: string | undefined): string[] {
    const reasons: string[] = [];

    if (!query) return reasons;

    const queryLower = query.toLowerCase();

    if (prompt.title.toLowerCase().includes(queryLower)) {
      reasons.push('Title match');
    }

    if (prompt.content.toLowerCase().includes(queryLower)) {
      reasons.push('Content match');
    }

    if (prompt.tags && prompt.tags.some((tag: string) => 
      tag.toLowerCase().includes(queryLower))) {
      reasons.push('Tag match');
    }

    return reasons;
  }

  private static async getTrendingPrompts(userId: string, limit: number) {
    // 過去7日間で使用回数が多いプロンプト
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await db.prompt.findMany({
      where: {
        OR: [
          { userId },
          { visibility: 'PUBLIC' },
          { 
            visibility: 'DEPARTMENT',
            user: { department: { in: [/* user department */] } }
          }
        ],
        usageLogs: {
          some: {
            createdAt: { gte: sevenDaysAgo }
          }
        }
      },
      include: {
        user: {
          select: { id: true, name: true, department: true }
        },
        _count: { select: { usageLogs: true, ratings: true } }
      },
      orderBy: [
        { usageCount: 'desc' },
        { averageRating: 'desc' }
      ],
      take: limit
    });
  }

  private static async getPersonalizedRecommendations(userId: string, limit: number) {
    // ユーザーの過去の使用履歴に基づく推奨
    const userUsage = await db.usageLog.findMany({
      where: { userId },
      include: { prompt: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const favoriteCategories = [...new Set(userUsage.map(u => u.prompt.category))];

    return await db.prompt.findMany({
      where: {
        AND: [
          { userId: { not: userId } }, // 自分のプロンプトは除外
          {
            OR: [
              { visibility: 'PUBLIC' },
              { 
                visibility: 'DEPARTMENT',
                user: { department: { in: [/* user department */] } }
              }
            ]
          },
          { category: { in: favoriteCategories } }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, department: true }
        },
        _count: { select: { usageLogs: true, ratings: true } }
      },
      orderBy: [
        { averageRating: 'desc' },
        { usageCount: 'desc' }
      ],
      take: limit
    });
  }

  private static async getCollaborativeRecommendations(userId: string, limit: number) {
    // 同じ部門の他のユーザーが高評価したプロンプト
    return await db.prompt.findMany({
      where: {
        AND: [
          { userId: { not: userId } },
          {
            OR: [
              { visibility: 'PUBLIC' },
              { 
                visibility: 'DEPARTMENT',
                user: { department: { in: [/* user department */] } }
              }
            ]
          },
          { averageRating: { gte: 4.0 } }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, department: true }
        },
        _count: { select: { usageLogs: true, ratings: true } }
      },
      orderBy: [
        { averageRating: 'desc' },
        { totalRatings: 'desc' }
      ],
      take: limit
    });
  }

  private static getRecommendationReason(prompt: any, type: string): string {
    switch (type) {
      case 'trending':
        return '最近人気急上昇中です';
      case 'collaborative':
        return 'あなたの部門で高評価を受けています';
      case 'personalized':
      default:
        return 'あなたがよく使うカテゴリです';
    }
  }

  private static calculateConfidence(prompt: any, user: any): number {
    let confidence = 0.5; // ベースライン

    // 評価数が多いほど信頼度が高い
    if (prompt._count.ratings > 10) confidence += 0.2;
    else if (prompt._count.ratings > 5) confidence += 0.1;

    // 平均評価が高いほど信頼度が高い
    if (prompt.averageRating > 4.5) confidence += 0.2;
    else if (prompt.averageRating > 4.0) confidence += 0.1;

    // 同じ部門だと信頼度が高い
    if (prompt.user.department === user.department) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }
}