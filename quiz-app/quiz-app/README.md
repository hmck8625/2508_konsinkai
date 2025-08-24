# 懇親会クイズアプリ

リアルタイムクイズアプリケーション - Vercel KVを使用した社内懇親会向けのクイズシステムです。

## 🚀 機能

- **リアルタイム回答**: 1秒ポーリングによる即座な結果反映
- **モバイル対応**: スマートフォンでの参加に最適化
- **ランキング表示**: スコア・順位のリアルタイム更新
- **管理機能**: 問題作成・進行管理・結果出力
- **スクリーン表示**: プロジェクター投影用の大画面表示
- **自動データ削除**: TTLによる24-48時間後の自動クリーンアップ

## 🏗️ 技術スタック

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Vercel KV (Redis)
- **Hosting**: Vercel
- **UI/UX**: レスポンシブデザイン、PWA対応

## 📱 画面構成

- `/` - ホーム画面（アクセス入口）
- `/join?e=CODE` - 参加者登録
- `/play` - クイズ回答画面
- `/host` - 管理者画面（進行・問題管理）
- `/screen?e=CODE` - スクリーン表示（投影用）

## 🔧 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local.example`をコピーして`.env.local`を作成：

```bash
cp .env.local.example .env.local
```

必要な環境変数：

```env
# Vercel KV設定
KV_REST_API_URL=https://your-kv-url.kv.vercel-storage.com
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_only_token

# 管理者パスワード
ADMIN_SECRET=your_secure_password

# オプション設定
EVENT_TTL_SEC=86400
SPEED_BONUS_MAX=50
TIME_LIMIT_DEFAULT=20
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## 📊 使用方法

### 管理者（司会者）

1. `/host` にアクセス
2. 管理者パスワードでログイン
3. イベントを作成（イベントID: 例 "QUIZ"）
4. 問題を登録（画面入力またはCSVインポート）
5. 各問題の進行：
   - 出題 → 締切 → 正解発表 → 次へ
6. 最終結果発表とCSVエクスポート

### 参加者

1. QRコードまたは `/join?e=QUIZ` にアクセス
2. ニックネーム入力で参加
3. `/play` でクイズに回答
4. リアルタイムで結果確認

### スクリーン表示

1. `/screen?e=QUIZ` をプロジェクターに表示
2. 問題・正解・ランキングが自動更新

## 🗂️ データ構造

### イベント管理
- `event:{id}:status` - ゲーム状態
- `event:{id}:config` - 設定情報
- `event:{id}:q:{qid}:meta` - 問題データ

### 参加者管理
- `event:{id}:players` - 参加者一覧
- `event:{id}:player:{playerId}` - 参加者情報

### 回答・スコア
- `event:{id}:q:{qid}:answer:{playerId}` - 回答データ
- `event:{id}:leaderboard` - ランキング
- `event:{id}:speed:{qid}` - 回答速度

## 🎯 スコア計算

```
基本スコア = 正解時 100ポイント
速度ボーナス = 残り時間比率 × 最大50ポイント（有効時）
連続ボーナス = 3連続正解 +50、5連続正解 +100（有効時）
```

同点時の順位決定：
1. 総回答時間が短い順
2. 最終正解が早い順

## 📋 問題CSV形式

```csv
qid,title,choice1,choice2,choice3,choice4,answerIndex,timeLimitSec
1,会社の創業年は？,2013,2014,2015,2016,2,20
2,今期のスローガンは？,Option A,Option B,Option C,Option D,3,25
```

## 🚀 デプロイ

### Vercel

1. Vercelにリポジトリを接続
2. Vercel KVデータベースを作成
3. 環境変数を設定
4. デプロイ実行

### 環境変数の設定（Vercel）

Vercel Dashboard → Settings → Environment Variables で設定：

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN` 
- `KV_REST_API_READ_ONLY_TOKEN`
- `ADMIN_SECRET`

## 🔒 セキュリティ

- 管理APIは`ADMIN_SECRET`認証必須
- 参加はイベントコード必須
- Rate limitによる不正アクセス防止
- サーバーサイド採点でデータ改ざん防止
- TTLによる自動データ削除

## 🎨 カスタマイズ

### 問題数・制限時間の変更

`src/lib/quiz-service.ts`で設定を調整

### UIテーマの変更

`src/app/globals.css`のCSS変数を編集

### 新機能の追加

1. 型定義: `src/types/quiz.ts`
2. API: `src/app/api/`
3. サービスロジック: `src/lib/`
4. UI: `src/app/*/page.tsx`

## 📞 トラブルシューティング

### よくある問題

**Q: Vercel KVに接続できない**
A: 環境変数が正しく設定されているか確認

**Q: 回答が反映されない**
A: ブラウザのキャッシュをクリアして再試行

**Q: モバイルでタップが効かない**
A: タッチターゲットサイズ（48px以上）を確認

### ログの確認

```bash
# 開発環境
npm run dev

# 本番環境
Vercel Dashboard → Functions → Logs
```

## 📈 運用ガイド

### 当日の準備（T-60分）

1. イベント作成と問題インポート
2. テスト回答の実施
3. プロジェクター接続確認
4. 予備回線の準備
5. QRコード配布準備

### 本番運用（T-15分〜）

1. ロビー開放とQRコード配布
2. 管理PC（`/host`）で待機
3. 各問題の進行管理
4. 最終結果発表とCSV保存

### 終了後

- CSVデータの保存
- TTLによる自動データ削除待機

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

**Built with ❤️ for 懇親会**
