'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { searchInfluencers, getAIRecommendations, Influencer, APIError, CampaignRequest, AIRecommendationResponse } from '@/lib/api';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minSubscribers, setMinSubscribers] = useState('');
  const [maxSubscribers, setMaxSubscribers] = useState('');
  const [filteredResults, setFilteredResults] = useState<Influencer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [aiResults, setAiResults] = useState<AIRecommendationResponse | null>(null);
  
  // AI推薦用の追加フィールド
  const [productName, setProductName] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [campaignGoals, setCampaignGoals] = useState('');

  useEffect(() => {
    setIsVisible(true);
    // 初期ロード時に全インフルエンサーを取得
    handleInitialLoad();
  }, []);

  const handleInitialLoad = async () => {
    try {
      setIsSearching(true);
      setError(null);
      
      const results = await searchInfluencers({});
      setFilteredResults(results);
      setHasSearched(true);
    } catch (err) {
      console.error('Initial load failed:', err);
      if (err instanceof APIError) {
        setError(`APIエラー: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`エラー: ${err.message}`);
      } else {
        setError('データの読み込みに失敗しました');
      }
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const categories = ['all', 'テクノロジー', '料理', 'フィットネス', '美容', 'ゲーム', 'ライフスタイル', '教育'];

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      setError(null);
      
      if (useAI) {
        // AI推薦の実行
        await handleAIRecommendation();
      } else {
        // 通常検索の実行 - APIエラー時はフィルタリングでモック処理
        const searchParams = {
          keyword: searchQuery.trim() || undefined,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          min_subscribers: minSubscribers ? parseInt(minSubscribers) : undefined,
          max_subscribers: maxSubscribers ? parseInt(maxSubscribers) : undefined,
        };

        const results = await searchInfluencers(searchParams);
        setFilteredResults(results);
        
        setAiResults(null);
      }
      
      setHasSearched(true);
    } catch (err) {
      if (err instanceof APIError) {
        setError(`検索エラー: ${err.message}`);
      } else {
        setError('検索中にエラーが発生しました');
      }
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAIRecommendation = async () => {
    try {
      // AI推薦に必要なフィールドの検証
      if (!productName || !budgetMin || !budgetMax || !targetAudience || !campaignGoals) {
        setError('AI推薦には商品名、予算、ターゲット層、キャンペーン目標の入力が必要です');
        return;
      }

      const campaign: CampaignRequest = {
        product_name: productName,
        budget_min: parseInt(budgetMin),
        budget_max: parseInt(budgetMax),
        target_audience: targetAudience.split(',').map(t => t.trim()),
        required_categories: selectedCategory !== 'all' ? [selectedCategory] : [],
        campaign_goals: campaignGoals,
        min_engagement_rate: 2.0,
        min_subscribers: minSubscribers ? parseInt(minSubscribers) : 1000,
        max_subscribers: maxSubscribers ? parseInt(maxSubscribers) : 100000,
      };

      const aiResponse = await getAIRecommendations(campaign);
      setAiResults(aiResponse);
      
      // AI結果をInfluencer[]形式に変換して表示
      const influencerResults: Influencer[] = aiResponse.recommendations.map(rec => ({
        id: rec.channel_id,
        name: `チャンネル ${rec.channel_id}`,
        channelId: rec.channel_id,
        subscriberCount: 8500, // 仮データ
        viewCount: 1250000,
        videoCount: 156,
        category: '推薦カテゴリ',
        description: rec.explanation,
        thumbnailUrl: 'https://via.placeholder.com/120x120',
        engagementRate: rec.detailed_scores.engagement * 10,
      }));
      
      setFilteredResults(influencerResults);
    } catch (err) {
      if (err instanceof APIError) {
        setError(`AI推薦エラー: ${err.message}`);
      } else {
        setError('AI推薦中にエラーが発生しました');
      }
      console.error('AI recommendation failed:', err);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gradient">
              InfuMatch
            </Link>
            <nav className="hidden md:flex space-x-8">
              <Link href="/search" className="text-indigo-600 font-medium border-b-2 border-indigo-600 pb-1">
                検索
              </Link>
              <Link href="/messages" className="text-gray-600 hover:text-indigo-600 transition-colors">
                メッセージ
              </Link>
              <Link href="/matching" className="text-gray-600 hover:text-indigo-600 transition-colors">
                AIマッチング
              </Link>
              <Link href="/settings" className="text-gray-600 hover:text-indigo-600 transition-colors">
                設定
              </Link>
            </nav>
            <button className="btn btn-primary">
              ログイン
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-6 py-8">
        <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {/* ヘッダーセクション */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              インフルエンサー
              <span className="text-gradient block">検索エンジン</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              AIが最適なYouTubeインフルエンサーを見つけて、マッチング精度95%を実現
            </p>
          </div>

          {/* 検索フォーム */}
          <div className="card p-8 mb-12 max-w-6xl mx-auto">
            {/* AI推薦モード切り替え */}
            <div className="mb-6 flex items-center justify-center">
              <div className="flex items-center space-x-4 bg-gray-100 p-2 rounded-lg">
                <button
                  onClick={() => setUseAI(false)}
                  className={`px-4 py-2 rounded-md transition-all ${
                    !useAI 
                      ? 'bg-white text-indigo-600 shadow-md' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  通常検索
                </button>
                <button
                  onClick={() => setUseAI(true)}
                  className={`px-4 py-2 rounded-md transition-all ${
                    useAI 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI推薦
                </button>
              </div>
            </div>

            {/* AI推薦専用フィールド */}
            {useAI && (
              <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AIキャンペーン推薦設定
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">商品名 *</label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="例: 新作スキンケアクリーム"
                      className="input bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">ターゲット層 *</label>
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="例: 20代女性,美容好き"
                      className="input bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">予算（最小） *</label>
                    <input
                      type="number"
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      placeholder="例: 50000"
                      className="input bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">予算（最大） *</label>
                    <input
                      type="number"
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      placeholder="例: 200000"
                      className="input bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">キャンペーン目標 *</label>
                    <textarea
                      value={campaignGoals}
                      onChange={(e) => setCampaignGoals(e.target.value)}
                      placeholder="例: 新商品の認知度向上と購入促進。特に20-30代女性をターゲットに..."
                      className="input bg-white h-20 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* キーワード検索 */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  キーワード検索
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="チャンネル名、説明文で検索..."
                  className="input bg-gray-50"
                />
              </div>

              {/* カテゴリー選択 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  カテゴリー
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="select bg-gray-50"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'すべて' : category}
                    </option>
                  ))}
                </select>
              </div>

              {/* 登録者数範囲 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  登録者数
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={minSubscribers}
                    onChange={(e) => setMinSubscribers(e.target.value)}
                    placeholder="最小"
                    className="input bg-gray-50 text-sm"
                  />
                  <span className="py-3 text-gray-400">〜</span>
                  <input
                    type="number"
                    value={maxSubscribers}
                    onChange={(e) => setMaxSubscribers(e.target.value)}
                    placeholder="最大"
                    className="input bg-gray-50 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 検索ボタン */}
            <div className="mt-8 text-center">
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="btn btn-primary text-lg px-12 py-4 relative"
              >
{isSearching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {useAI ? 'AI推薦実行中...' : '検索中...'}
                  </>
                ) : (
                  <>
                    {useAI ? (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                    {useAI ? 'AI推薦を開始' : '検索を開始'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* AI推薦結果のサマリー */}
          {useAI && aiResults && (
            <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
              <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI推薦結果サマリー
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600">推薦品質</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {aiResults.ai_evaluation.recommendation_quality === 'high' ? '高' : 
                     aiResults.ai_evaluation.recommendation_quality === 'medium' ? '中' : '低'}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600">期待ROI</div>
                  <div className="text-lg font-semibold text-green-600">
                    {aiResults.ai_evaluation.expected_roi}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <div className="text-sm text-gray-600">多様性スコア</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {(aiResults.portfolio_optimization.diversity_score * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              {aiResults.ai_evaluation.key_strengths.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">強み:</div>
                  <div className="flex flex-wrap gap-2">
                    {aiResults.ai_evaluation.key_strengths.map((strength, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 検索結果ヘッダー */}
          {hasSearched && (
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {useAI ? 'AI推薦結果' : '検索結果'}
                </h2>
                <p className="text-gray-600 mt-1">
                  <span className="font-semibold text-indigo-600">{filteredResults.length}</span>人のインフルエンサーが見つかりました
                  {useAI && aiResults && (
                    <span className="ml-2 text-purple-600">
                      (候補者{aiResults.matching_summary.total_candidates}人から選出)
                    </span>
                  )}
                </p>
              </div>
            
              {/* ソートオプション */}
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">並び替え:</label>
                <select className="select bg-white text-sm">
                  <option>登録者数が多い順</option>
                  <option>エンゲージメント率が高い順</option>
                  <option>最新の投稿順</option>
                </select>
              </div>
            </div>
          )}

          {/* インフルエンサーカード一覧 */}
          {hasSearched && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredResults.map((influencer, index) => (
              <div
                key={influencer.id}
                className={`card-interactive group transform transition-all duration-500 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
                style={{transitionDelay: `${index * 100}ms`}}
              >
                <div className="p-6">
                  {/* ヘッダー部分 */}
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="relative">
                      <img
                        src={influencer.thumbnailUrl}
                        alt={influencer.name}
                        className="w-16 h-16 rounded-full border-3 border-gray-200 group-hover:border-indigo-300 transition-colors"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
                        {influencer.name}
                      </h3>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="badge badge-primary">{influencer.category}</span>
                        <span className="text-xs text-gray-500">認証済み</span>
                      </div>
                    </div>
                  </div>

                  {/* 説明文 */}
                  <p className="text-sm text-gray-600 mb-6 line-clamp-2">
                    {influencer.description}
                  </p>

                  {/* 統計情報 */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <svg className="w-4 h-4 text-indigo-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500">登録者数</p>
                      <p className="font-bold text-gray-900">{formatNumber(influencer.subscriberCount)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <svg className="w-4 h-4 text-pink-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500">エンゲージメント</p>
                      <p className="font-bold text-pink-600">{influencer.engagementRate}%</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <svg className="w-4 h-4 text-purple-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500">動画数</p>
                      <p className="font-bold text-purple-600">{influencer.videoCount}</p>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex space-x-3">
                    <button className="btn btn-primary flex-1 text-sm py-2">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      コンタクト
                    </button>
                    <button className="btn btn-outline flex-1 text-sm py-2">
                      詳細
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}

          {/* 結果が0件の場合 */}
          {hasSearched && filteredResults.length === 0 && !isSearching && !error && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <svg className="w-24 h-24 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">検索結果が見つかりません</h3>
                <p className="text-gray-500 mb-6">
                  検索条件を変更して再度お試しください。
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setMinSubscribers('');
                    setMaxSubscribers('');
                    setError(null);
                    handleInitialLoad();
                  }}
                  className="btn btn-outline"
                >
                  検索条件をリセット
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}