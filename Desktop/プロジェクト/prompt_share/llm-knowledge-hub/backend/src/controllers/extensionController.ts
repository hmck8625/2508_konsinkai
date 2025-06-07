import { Request, Response } from 'express';
import { db } from '../utils/database';
import { AuthRequest } from '../middleware/auth';

export class ExtensionController {
  // 拡張機能からの会話データ受信
  static async receiveConversation(req: AuthRequest, res: Response) {
    try {
      const {
        session_id,
        timestamp,
        platform,
        model,
        conversation,
        context,
        metadata
      } = req.body;

      // 重複チェック
      const existing = await db.conversationData.findFirst({
        where: {
          sessionId: session_id,
          userId: req.user!.id,
          prompt: conversation.prompt,
          response: conversation.response
        }
      });

      if (existing) {
        return res.json({
          conversation_id: existing.id,
          status: 'duplicate',
          message: 'Conversation already exists'
        });
      }

      // 会話データを保存
      const conversationData = await db.conversationData.create({
        data: {
          sessionId: session_id,
          userId: req.user!.id,
          platform,
          model,
          prompt: conversation.prompt,
          response: conversation.response,
          tokensUsed: conversation.tokens_used,
          responseTime: conversation.response_time,
          url: context?.url,
          tabTitle: context?.tab_title,
          userDepartment: context?.user_department || req.user!.department,
          detectedCategory: context?.detected_category,
          autoTags: metadata?.auto_tags,
          metadata: {
            browser: metadata?.browser,
            extension_version: metadata?.extension_version,
            ...metadata
          }
        }
      });

      // バックグラウンドで自動分析・プロンプト化を実行
      ExtensionController.processConversationAsync(conversationData.id);

      res.json({
        conversation_id: conversationData.id,
        status: 'received',
        message: 'データを正常に受信しました'
      });
    } catch (error) {
      console.error('Receive conversation error:', error);
      res.status(500).json({ 
        status: 'error',
        message: 'Internal server error' 
      });
    }
  }

  // 拡張機能用の推奨取得
  static async getRecommendationsForExtension(req: AuthRequest, res: Response) {
    try {
      const { query, limit = 3 } = req.body;

      if (!query || query.length < 10) {
        return res.json({ recommendations: [] });
      }

      // クエリに関連するプロンプトを検索
      const prompts = await db.prompt.findMany({
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
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } }
              ]
            }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { averageRating: 'desc' },
          { usageCount: 'desc' }
        ],
        take: Number(limit)
      });

      const recommendations = prompts.map(prompt => ({
        prompt_id: prompt.id,
        title: prompt.title,
        preview: ExtensionController.generatePreview(prompt.content),
        category: prompt.category,
        rating: prompt.averageRating || 0,
        usage_count: prompt.usageCount,
        author: prompt.user.name,
        score: ExtensionController.calculateRelevanceScore(prompt, query)
      }));

      res.json({ recommendations });
    } catch (error) {
      console.error('Get recommendations for extension error:', error);
      res.status(500).json({ recommendations: [] });
    }
  }

  // プロンプト実行用データ取得
  static async getPromptForExecution(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const prompt = await db.prompt.findUnique({
        where: { id },
        include: {
          templates: {
            select: {
              id: true,
              templateContent: true,
              variables: true,
              usageGuide: true
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

      // 使用ログを記録
      await db.usageLog.create({
        data: {
          userId: req.user!.id,
          promptId: id,
          executionType: 'SEND'
        }
      });

      // 使用回数を増加
      await db.prompt.update({
        where: { id },
        data: { usageCount: { increment: 1 } }
      });

      res.json({
        prompt: {
          id: prompt.id,
          title: prompt.title,
          content: prompt.content,
          category: prompt.category,
          templates: prompt.templates
        }
      });
    } catch (error) {
      console.error('Get prompt for execution error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 会話データの統計情報取得
  static async getExtensionStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // 基本統計
      const [
        totalConversations,
        processedConversations,
        totalPrompts,
        todayConversations
      ] = await Promise.all([
        db.conversationData.count({ where: { userId } }),
        db.conversationData.count({ where: { userId, processed: true } }),
        db.prompt.count({ where: { userId } }),
        db.conversationData.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ]);

      // 過去7日間の使用統計
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyUsage = await db.usageLog.count({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo }
        }
      });

      // プラットフォーム別統計
      const platformStats = await db.conversationData.groupBy({
        by: ['platform'],
        where: { userId },
        _count: true
      });

      res.json({
        totalConversations,
        processedConversations,
        totalPrompts,
        todayConversations,
        weeklyUsage,
        platformStats: platformStats.map(stat => ({
          platform: stat.platform,
          count: stat._count
        })),
        processingRate: totalConversations > 0 ? 
          (processedConversations / totalConversations * 100).toFixed(1) : 0
      });
    } catch (error) {
      console.error('Get extension stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  // 非同期で会話データを処理してプロンプト化
  private static async processConversationAsync(conversationId: string) {
    try {
      const conversation = await db.conversationData.findUnique({
        where: { id: conversationId }
      });

      if (!conversation || conversation.processed) {
        return;
      }

      // 品質評価
      const qualityScore = ExtensionController.assessQuality(conversation);

      // 一定以上の品質の場合、自動でプロンプトとして保存
      if (qualityScore >= 3.5) {
        const category = ExtensionController.detectCategory(conversation);
        const tags = ExtensionController.extractTags(conversation);

        await db.prompt.create({
          data: {
            userId: conversation.userId,
            title: ExtensionController.generateTitle(conversation),
            content: conversation.prompt,
            response: conversation.response,
            llmModel: conversation.model,
            category,
            tags,
            qualityScore,
            visibility: 'PRIVATE', // 初期は非公開
            estimatedTokens: conversation.tokensUsed
          }
        });
      }

      // 処理済みマーク
      await db.conversationData.update({
        where: { id: conversationId },
        data: { processed: true }
      });
    } catch (error) {
      console.error('Process conversation async error:', error);
    }
  }

  // ヘルパーメソッド
  private static generatePreview(content: string): string {
    return content.length > 80 ? content.substring(0, 80) + '...' : content;
  }

  private static calculateRelevanceScore(prompt: any, query: string): number {
    let score = 0;

    const queryLower = query.toLowerCase();
    const titleLower = prompt.title.toLowerCase();
    const contentLower = prompt.content.toLowerCase();

    // タイトルマッチ
    if (titleLower.includes(queryLower)) score += 0.4;

    // コンテンツマッチ
    if (contentLower.includes(queryLower)) score += 0.3;

    // 評価による重み付け
    if (prompt.averageRating) score += (prompt.averageRating / 5) * 0.2;

    // 使用回数による重み付け
    if (prompt.usageCount > 10) score += 0.1;

    return Math.min(score, 1.0);
  }

  private static assessQuality(conversation: any): number {
    let score = 0;

    // プロンプトの長さ
    if (conversation.prompt.length > 50) score += 1;
    if (conversation.prompt.length > 200) score += 1;

    // レスポンスの長さ
    if (conversation.response.length > 100) score += 1;
    if (conversation.response.length > 500) score += 1;

    // 専門的なキーワードの存在
    const professionalKeywords = ['分析', '作成', '設計', '戦略', '計画', '最適化'];
    const hasKeywords = professionalKeywords.some(keyword => 
      conversation.prompt.includes(keyword)
    );
    if (hasKeywords) score += 1;

    return score;
  }

  private static detectCategory(conversation: any): string {
    const prompt = conversation.prompt.toLowerCase();

    if (prompt.includes('メール') || prompt.includes('email')) return 'email_writing';
    if (prompt.includes('資料') || prompt.includes('プレゼン')) return 'document_creation';
    if (prompt.includes('コード') || prompt.includes('プログラム')) return 'coding';
    if (prompt.includes('分析') || prompt.includes('データ')) return 'analysis';
    if (prompt.includes('計画') || prompt.includes('戦略')) return 'planning';
    if (prompt.includes('翻訳') || prompt.includes('英語')) return 'translation';

    return 'other';
  }

  private static extractTags(conversation: any): string[] {
    const tags: string[] = [];
    const content = (conversation.prompt + ' ' + conversation.response).toLowerCase();

    // 基本的なタグ抽出ロジック
    const tagKeywords = {
      'ビジネス': ['ビジネス', '業務', '仕事'],
      'マーケティング': ['マーケティング', '広告', '宣伝'],
      'プログラミング': ['プログラミング', 'コード', '開発'],
      '分析': ['分析', 'データ', '統計'],
      'メール': ['メール', 'email', '連絡'],
      '企画': ['企画', '計画', 'プラン']
    };

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        tags.push(tag);
      }
    }

    return tags;
  }

  private static generateTitle(conversation: any): string {
    const prompt = conversation.prompt;
    
    // 最初の50文字から意味のあるタイトルを生成
    let title = prompt.substring(0, 50).trim();
    
    // 改行で区切って最初の行を使用
    const firstLine = prompt.split('\n')[0];
    if (firstLine.length <= 60) {
      title = firstLine;
    }

    // 文末の調整
    if (title.endsWith('。') || title.endsWith('.')) {
      title = title.slice(0, -1);
    }

    return title || '自動生成されたプロンプト';
  }
}