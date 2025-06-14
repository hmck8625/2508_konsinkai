/**
 * ランディングページ（ホームページ）
 * 
 * @description YouTube Influencer Matching Agent のメインランディングページ
 * 訪問者に対してサービスの価値提案を行い、ユーザー登録やデモへ誘導
 * 
 * @author InfuMatch Development Team
 * @version 1.0.0
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroSection } from '@/components/sections/hero-section';
import { FeaturesSection } from '@/components/sections/features-section';
import { HowItWorksSection } from '@/components/sections/how-it-works-section';
import { StatsSection } from '@/components/sections/stats-section';
import { TestimonialsSection } from '@/components/sections/testimonials-section';
import { CTASection } from '@/components/sections/cta-section';
import { 
  Play, 
  Zap, 
  Target, 
  BarChart3, 
  MessageSquare, 
  Shield,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

/**
 * ランディングページのメタデータ
 */
export const metadata = {
  title: 'YouTube Influencer Matching Agent - AIが自動で交渉まで代行',
  description: 'YouTubeマイクロインフルエンサーと企業を自動でマッチング。AIエージェントが交渉から契約まで代行し、効率的なインフルエンサーマーケティングを実現。',
};

/**
 * メインのランディングページコンポーネント
 */
export default function HomePage() {
  return (
    <div className=\"flex flex-col min-h-screen\">
      {/* ヒーローセクション */}
      <HeroSection />
      
      {/* 特徴セクション */}
      <FeaturesSection />
      
      {/* 動作原理セクション */}
      <HowItWorksSection />
      
      {/* 統計セクション */}
      <StatsSection />
      
      {/* お客様の声セクション */}
      <TestimonialsSection />
      
      {/* CTA セクション */}
      <CTASection />
    </div>
  );
}

/**
 * ヒーローセクション下のベネフィット表示
 * 
 * @description 主要な価値提案を3つのカードで表示
 */
function BenefitsPreview() {
  const benefits = [
    {
      icon: <Zap className=\"h-8 w-8 text-primary\" />,
      title: '90%の工数削減',
      description: 'AI自動化で手動作業を大幅カット',
      highlight: '従来比',
    },
    {
      icon: <Target className=\"h-8 w-8 text-accent\" />,
      title: '高精度マッチング',
      description: 'YouTube特化で最適な組み合わせ',
      highlight: '95%適合率',
    },
    {
      icon: <MessageSquare className=\"h-8 w-8 text-success\" />,
      title: '自然な交渉',
      description: 'AIとバレない人間らしい交渉',
      highlight: '成約率30%',
    },
  ];

  return (
    <section className=\"py-16 bg-muted/30\">
      <div className=\"container mx-auto px-4\">
        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto\">
          {benefits.map((benefit, index) => (
            <Card key={index} className=\"text-center card-hover\">
              <CardHeader className=\"pb-4\">
                <div className=\"flex justify-center mb-3\">
                  {benefit.icon}
                </div>
                <Badge variant=\"secondary\" className=\"mb-2\">
                  {benefit.highlight}
                </Badge>
                <CardTitle className=\"text-lg\">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className=\"text-sm\">
                  {benefit.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * 問題提起セクション
 * 
 * @description 現在の課題を明確にして、ソリューションの必要性を訴求
 */
function ProblemSection() {
  const problems = [
    'インフルエンサーとのコネクションがない',
    '適切な報酬設定が分からない',
    '交渉に時間とスキルが必要',
    '効果測定が困難',
    '小規模案件は代理店が対応してくれない',
  ];

  return (
    <section className=\"py-16 bg-background\">
      <div className=\"container mx-auto px-4\">
        <div className=\"max-w-3xl mx-auto text-center\">
          <h2 className=\"text-3xl font-bold mb-6\">
            中小企業のインフルエンサーマーケティング、
            <span className=\"text-destructive\">こんな課題ありませんか？</span>
          </h2>
          
          <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8\">
            {problems.map((problem, index) => (
              <div key={index} className=\"flex items-start text-left p-4 bg-muted/50 rounded-lg\">
                <div className=\"w-2 h-2 bg-destructive rounded-full mt-2 mr-3 flex-shrink-0\" />
                <span className=\"text-sm text-muted-foreground\">{problem}</span>
              </div>
            ))}
          </div>
          
          <p className=\"text-lg text-muted-foreground mb-6\">
            これらの課題を<strong className=\"text-foreground\">AI エージェント</strong>が全て解決します
          </p>
          
          <Button size=\"lg\" className=\"btn-animate\" asChild>
            <Link href=\"#solution\">
              解決策を見る
              <ArrowRight className=\"ml-2 h-4 w-4\" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * ソリューション紹介セクション
 * 
 * @description 具体的な解決策とその仕組みを説明
 */
function SolutionSection() {
  const solutions = [
    {
      step: '01',
      title: 'AI がインフルエンサーを発見',
      description: 'YouTube特化で1000人〜10万人のマイクロインフルエンサーを自動発見。商材に最適な相手を高精度でマッチング。',
      icon: <Target className=\"h-6 w-6\" />,
    },
    {
      step: '02', 
      title: 'AI エージェントが自動交渉',
      description: '人間らしい自然な文面で初回コンタクト。料金交渉から契約条件まで、AIが代行して成約率30%を実現。',
      icon: <MessageSquare className=\"h-6 w-6\" />,
    },
    {
      step: '03',
      title: 'ダッシュボードで一元管理',
      description: '全案件の進捗をリアルタイム管理。ROI分析や効果測定も自動で生成され、次回施策の改善に活用。',
      icon: <BarChart3 className=\"h-6 w-6\" />,
    },
  ];

  return (
    <section id=\"solution\" className=\"py-16 bg-gradient-to-br from-primary/5 to-accent/5\">
      <div className=\"container mx-auto px-4\">
        <div className=\"max-w-4xl mx-auto\">
          <div className=\"text-center mb-12\">
            <Badge variant=\"outline\" className=\"mb-4\">
              AIエージェント・ソリューション
            </Badge>
            <h2 className=\"text-3xl font-bold mb-4\">
              3ステップで完結する
              <span className=\"gradient-text block\">自動インフルエンサーマーケティング</span>
            </h2>
            <p className=\"text-lg text-muted-foreground\">
              従来の手動プロセスを AI が自動化。工数90%削減で効率的な施策実行を実現
            </p>
          </div>
          
          <div className=\"space-y-8\">
            {solutions.map((solution, index) => (
              <div key={index} className=\"flex flex-col md:flex-row items-start md:items-center gap-6\">
                <div className=\"flex items-center gap-4 md:w-1/3\">
                  <div className=\"flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold\">
                    {solution.step}
                  </div>
                  <div className=\"flex items-center gap-2\">
                    {solution.icon}
                    <h3 className=\"text-lg font-semibold\">{solution.title}</h3>
                  </div>
                </div>
                
                <div className=\"md:w-2/3\">
                  <p className=\"text-muted-foreground\">{solution.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className=\"text-center mt-12\">
            <Button size=\"lg\" className=\"btn-animate\" asChild>
              <Link href=\"/demo\">
                <Play className=\"mr-2 h-4 w-4\" />
                3分デモを見る
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * 信頼性・セキュリティセクション
 * 
 * @description Google Cloud基盤であることと、セキュリティの安心感を訴求
 */
function TrustSection() {
  const trustFactors = [
    {
      icon: <Shield className=\"h-6 w-6\" />,
      title: 'Google Cloud 基盤',
      description: 'エンタープライズレベルのセキュリティ',
    },
    {
      icon: <CheckCircle className=\"h-6 w-6\" />,
      title: 'GDPR準拠',
      description: '個人情報保護法に完全対応',
    },
    {
      icon: <BarChart3 className=\"h-6 w-6\" />,
      title: '99.9%稼働率',
      description: '24/7 監視体制で安定運用',
    },
  ];

  return (
    <section className=\"py-16 bg-muted/30\">
      <div className=\"container mx-auto px-4\">
        <div className=\"max-w-4xl mx-auto text-center\">
          <h2 className=\"text-2xl font-bold mb-8\">
            <span className=\"text-primary\">Google Cloud</span> で構築された
            信頼できるプラットフォーム
          </h2>
          
          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
            {trustFactors.map((factor, index) => (
              <div key={index} className=\"flex flex-col items-center text-center p-4\">
                <div className=\"w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3\">
                  {factor.icon}
                </div>
                <h3 className=\"font-semibold mb-2\">{factor.title}</h3>
                <p className=\"text-sm text-muted-foreground\">{factor.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}