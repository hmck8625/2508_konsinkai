/**
 * ルートレイアウトコンポーネント
 * 
 * @description アプリケーション全体の基盤となるレイアウト
 * Next.js 14 App Router のルートレイアウト
 * 
 * @author InfuMatch Development Team
 * @version 1.0.0
 */

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

// Google Fonts の設定
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// メタデータの設定
export const metadata: Metadata = {
  title: {
    default: 'YouTube Influencer Matching Agent',
    template: '%s | InfuMatch',
  },
  description: 'YouTubeマイクロインフルエンサーと企業を自動でマッチングし、AIエージェントが交渉まで代行する革新的なプラットフォーム',
  keywords: [
    'YouTube',
    'インフルエンサー',
    'マーケティング',
    'AI',
    'エージェント',
    'マッチング',
    '自動交渉',
    'Google Cloud',
  ],
  authors: [
    {
      name: 'InfuMatch Development Team',
      url: 'https://infumatch.com',
    },
  ],
  creator: 'InfuMatch',
  publisher: 'InfuMatch',
  
  // OGP設定
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://infumatch.vercel.app',
    title: 'YouTube Influencer Matching Agent',
    description: 'YouTubeマイクロインフルエンサーと企業を自動でマッチングし、AIエージェントが交渉まで代行',
    siteName: 'InfuMatch',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'InfuMatch - YouTube Influencer Matching Agent',
      },
    ],
  },
  
  // Twitter Card設定
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Influencer Matching Agent',
    description: 'YouTubeマイクロインフルエンサーと企業を自動でマッチング',
    images: ['/og-image.png'],
    creator: '@infumatch',
  },
  
  // アプリ関連
  applicationName: 'InfuMatch',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InfuMatch',
  },
  
  // robots.txt設定
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // 言語設定
  alternates: {
    canonical: 'https://infumatch.vercel.app',
    languages: {
      'ja-JP': 'https://infumatch.vercel.app',
      'en-US': 'https://infumatch.vercel.app/en',
    },
  },
  
  // 検証タグ
  verification: {
    google: 'your-google-verification-code',
  },
  
  // カテゴリ
  category: 'technology',
};

// ビューポート設定
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e3a8a' },
  ],
};

/**
 * ルートレイアウトコンポーネント
 * 
 * @param children - 子コンポーネント
 * @returns JSX.Element
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang=\"ja\" 
      className={cn(
        'scroll-smooth antialiased',
        inter.variable,
        jetbrainsMono.variable
      )}
      suppressHydrationWarning
    >
      <head>
        {/* プリロード設定 */}
        <link
          rel=\"preload\"
          href=\"/fonts/inter-latin.woff2\"
          as=\"font\"
          type=\"font/woff2\"
          crossOrigin=\"anonymous\"
        />
        
        {/* Favicon */}
        <link rel=\"icon\" type=\"image/x-icon\" href=\"/favicon.ico\" />
        <link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"/favicon-32x32.png\" />
        <link rel=\"icon\" type=\"image/png\" sizes=\"16x16\" href=\"/favicon-16x16.png\" />
        <link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"/apple-touch-icon.png\" />
        
        {/* マニフェスト */}
        <link rel=\"manifest\" href=\"/manifest.json\" />
        
        {/* 外部リソースのプリコネクト */}
        <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />
        <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossOrigin=\"anonymous\" />
        <link rel=\"dns-prefetch\" href=\"https://www.googleapis.com\" />
        <link rel=\"dns-prefetch\" href=\"https://storage.googleapis.com\" />
        
        {/* セキュリティヘッダー */}
        <meta httpEquiv=\"X-Content-Type-Options\" content=\"nosniff\" />
        <meta httpEquiv=\"X-Frame-Options\" content=\"DENY\" />
        <meta httpEquiv=\"X-XSS-Protection\" content=\"1; mode=block\" />
        <meta name=\"referrer\" content=\"strict-origin-when-cross-origin\" />
        
        {/* 検索エンジン最適化 */}
        <meta name=\"format-detection\" content=\"telephone=no\" />
        <meta name=\"theme-color\" content=\"#3b82f6\" />
        
        {/* Google Analytics（本番環境のみ） */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                    page_title: document.title,
                    page_location: window.location.href,
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      
      <body className={cn(
        'min-h-screen bg-background font-sans antialiased',
        'selection:bg-primary/20 selection:text-primary-foreground'
      )}>
        {/* プロバイダーでアプリケーション全体をラップ */}
        <Providers>
          {/* メインレイアウト構造 */}
          <div className=\"relative flex min-h-screen flex-col\">
            {/* ヘッダー */}
            <Header />
            
            {/* メインコンテンツ */}
            <main className=\"flex-1\">
              {children}
            </main>
            
            {/* フッター */}
            <Footer />
          </div>
          
          {/* グローバルコンポーネント */}
          <Toaster />
        </Providers>
        
        {/* スクリプト: 外部サービス初期化 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // ページ読み込み完了時の処理
              window.addEventListener('load', function() {
                // パフォーマンス測定
                if ('performance' in window) {
                  const perfData = performance.getEntriesByType('navigation')[0];
                  console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
                }
                
                // Service Worker登録（本番環境のみ）
                if ('serviceWorker' in navigator && '${process.env.NODE_ENV}' === 'production') {
                  navigator.serviceWorker.register('/sw.js');
                }
              });
              
              // エラーハンドリング
              window.addEventListener('error', function(e) {
                console.error('Global error:', e.error);
                // 本番環境ではエラーレポートサービスに送信
              });
              
              window.addEventListener('unhandledrejection', function(e) {
                console.error('Unhandled promise rejection:', e.reason);
                // 本番環境ではエラーレポートサービスに送信
              });
            `,
          }}
        />
      </body>
    </html>
  );
}