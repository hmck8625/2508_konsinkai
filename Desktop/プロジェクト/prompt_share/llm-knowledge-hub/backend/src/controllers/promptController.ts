import { Request, Response } from 'express';
import { db } from '../utils/database';
import { AuthRequest } from '../middleware/auth';

export class PromptController {
  // プロンプト一覧取得
  static async getPrompts(req: AuthRequest, res: Response) {
    try {
      const { 
        category, 
        difficulty, 
        visibility, 
        sort = 'created_at',
        order = 'desc',
        limit = 20,
        offset = 0 
      } = req.query;

      const where: any = {};

      // カテゴリフィルター
      if (category) {
        where.category = category;
      }

      // 難易度フィルター
      if (difficulty) {
        where.difficulty = difficulty;
      }

      // 可視性フィルター
      if (visibility) {
        where.visibility = visibility;
      } else {
        // デフォルトでは、自分のプロンプトか公開されているもの、または同部門のものを表示
        where.OR = [
          { userId: req.user!.id },
          { visibility: 'PUBLIC' },
          { 
            visibility: 'DEPARTMENT',
            user: { department: req.user!.department }
          }
        ];
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
        orderBy: {
          [sort as string]: order
        },
        take: Number(limit),
        skip: Number(offset)
      });

      const total = await db.prompt.count({ where });

      res.json({
        prompts,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: total > Number(offset) + Number(limit)
        }
      });
    } catch (error) {
      console.error('Get prompts error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // プロンプト詳細取得
  static async getPrompt(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const prompt = await db.prompt.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              department: true
            }
          },
          ratings: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          templates: {
            select: {
              id: true,
              templateContent: true,
              variables: true,
              usageGuide: true,
              usageCount: true
            }
          },
          _count: {
            select: {
              ratings: true,
              usageLogs: true,
              comments: true
            }
          }
        }
      });

      if (!prompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }

      // アクセス権限チェック
      if (prompt.visibility === 'PRIVATE' && prompt.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (prompt.visibility === 'DEPARTMENT' && 
          prompt.user.department !== req.user!.department &&
          prompt.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // 使用回数を増やす
      await db.prompt.update({
        where: { id },
        data: { usageCount: { increment: 1 } }
      });

      res.json({ prompt });
    } catch (error) {
      console.error('Get prompt error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // プロンプト作成
  static async createPrompt(req: AuthRequest, res: Response) {
    try {
      const {
        title,
        content,
        response,
        llmModel,
        category,
        subcategory,
        difficulty,
        tags,
        visibility
      } = req.body;

      const prompt = await db.prompt.create({
        data: {
          userId: req.user!.id,
          title,
          content,
          response,
          llmModel,
          category,
          subcategory,
          difficulty,
          tags,
          visibility
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              department: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Prompt created successfully',
        prompt
      });
    } catch (error) {
      console.error('Create prompt error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // プロンプト更新
  static async updatePrompt(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // 所有者チェック
      const existingPrompt = await db.prompt.findUnique({
        where: { id }
      });

      if (!existingPrompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }

      if (existingPrompt.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const prompt = await db.prompt.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              department: true
            }
          }
        }
      });

      res.json({
        message: 'Prompt updated successfully',
        prompt
      });
    } catch (error) {
      console.error('Update prompt error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // プロンプト削除
  static async deletePrompt(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // 所有者チェック
      const existingPrompt = await db.prompt.findUnique({
        where: { id }
      });

      if (!existingPrompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }

      if (existingPrompt.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await db.prompt.delete({
        where: { id }
      });

      res.json({ message: 'Prompt deleted successfully' });
    } catch (error) {
      console.error('Delete prompt error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // プロンプト評価
  static async ratePrompt(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { usefulness, easeOfUse, resultQuality, timeSaved, comment, improvements } = req.body;

      // プロンプト存在確認
      const prompt = await db.prompt.findUnique({
        where: { id }
      });

      if (!prompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }

      // 既存の評価をチェック
      const existingRating = await db.rating.findUnique({
        where: {
          promptId_userId: {
            promptId: id,
            userId: req.user!.id
          }
        }
      });

      let rating;
      if (existingRating) {
        // 評価を更新
        rating = await db.rating.update({
          where: {
            promptId_userId: {
              promptId: id,
              userId: req.user!.id
            }
          },
          data: {
            usefulness,
            easeOfUse,
            resultQuality,
            timeSaved,
            comment,
            improvements
          }
        });
      } else {
        // 新しい評価を作成
        rating = await db.rating.create({
          data: {
            promptId: id,
            userId: req.user!.id,
            usefulness,
            easeOfUse,
            resultQuality,
            timeSaved,
            comment,
            improvements
          }
        });
      }

      // プロンプトの平均評価を更新
      const ratings = await db.rating.findMany({
        where: { promptId: id }
      });

      const averageRating = ratings.reduce((sum, r) => 
        sum + (r.usefulness + r.easeOfUse + r.resultQuality) / 3, 0
      ) / ratings.length;

      await db.prompt.update({
        where: { id },
        data: {
          averageRating,
          totalRatings: ratings.length
        }
      });

      res.json({
        message: 'Rating submitted successfully',
        rating,
        updatedAverage: averageRating
      });
    } catch (error) {
      console.error('Rate prompt error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // プロンプトコメント追加
  static async addComment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      // プロンプト存在確認
      const prompt = await db.prompt.findUnique({
        where: { id }
      });

      if (!prompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }

      const comment = await db.comment.create({
        data: {
          promptId: id,
          userId: req.user!.id,
          content
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Comment added successfully',
        comment
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 使用ログ記録
  static async logUsage(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { executionType, timeSaved } = req.body;

      const usageLog = await db.usageLog.create({
        data: {
          userId: req.user!.id,
          promptId: id,
          executionType,
          timeSaved
        }
      });

      res.status(201).json({
        message: 'Usage logged successfully',
        usageLog
      });
    } catch (error) {
      console.error('Log usage error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}