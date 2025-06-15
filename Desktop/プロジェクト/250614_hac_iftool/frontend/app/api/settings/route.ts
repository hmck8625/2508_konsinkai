import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// モック設定データ（実際にはデータベースを使用）
let mockSettings = {
  companyName: 'InfuMatch株式会社',
  industry: 'インフルエンサーマーケティング',
  description: 'YouTubeインフルエンサーと企業をAIでマッチングし、自動交渉まで行うプラットフォームサービスを提供しています。',
  contactEmail: 'contact@infumatch.com',
  contactPerson: '田中美咲',
  products: [
    {
      id: '1',
      name: 'プレミアム調味料セット',
      category: '食品・調味料',
      description: '健康志向の方向けの無添加調味料3点セット',
      targetAudience: '20-40代女性、料理好き、健康志向',
      keyFeatures: ['無添加', '国産原料', '減塩対応'],
      priceRange: { min: 3000, max: 5000, currency: 'JPY' },
      campaignTypes: ['商品紹介', 'レシピ動画', 'お試しレビュー']
    }
  ],
  negotiationSettings: {
    defaultBudgetRange: { min: 20000, max: 100000 },
    negotiationTone: 'friendly',
    keyPriorities: ['エンゲージメント率', 'ターゲット適合性', 'コストパフォーマンス'],
    avoidTopics: ['政治的内容', '競合他社言及'],
    specialInstructions: '親しみやすく、相手の立場を理解した交渉を心がけてください。初回は控えめな提案から始めて、徐々に条件を調整していくスタイルでお願いします。',
    maxNegotiationRounds: 5,
    autoApprovalThreshold: 50000
  },
  matchingPreferences: {
    preferredChannelTypes: ['料理・グルメ', 'ライフスタイル', '美容・健康'],
    minimumSubscribers: 5000,
    maximumSubscribers: 500000,
    preferredCategories: ['料理', '健康', 'ライフスタイル'],
    geographicPreferences: ['日本'],
    ageGroups: ['20-29', '30-39', '40-49'],
    excludeKeywords: ['競合他社名', '政治', 'ギャンブル'],
    priorityKeywords: ['健康', '無添加', '料理', 'レシピ', '調味料']
  }
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: 実際の実装では、ユーザーIDに基づいてFirestoreから設定を取得
    // const userId = session.user.id;
    // const settings = await getSettingsFromFirestore(userId);
    
    return NextResponse.json(mockSettings);
  } catch (error) {
    console.error('設定取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // バリデーション
    if (!body.companyName || typeof body.companyName !== 'string') {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // TODO: 実際の実装では、ユーザーIDに基づいてFirestoreに設定を保存
    // const userId = session.user.id;
    // await saveSettingsToFirestore(userId, body);
    
    // モックデータを更新
    mockSettings = {
      ...mockSettings,
      ...body,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully',
      settings: mockSettings 
    });
  } catch (error) {
    console.error('設定保存エラー:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

// 設定データを取得する関数（他のAPIで使用）
export function getCurrentSettings() {
  return mockSettings;
}