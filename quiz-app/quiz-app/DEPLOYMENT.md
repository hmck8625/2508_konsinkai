# デプロイガイド

## Vercelへのデプロイ手順

### 1. Vercelアカウントの準備

1. [Vercel](https://vercel.com)でアカウント作成
2. GitHubアカウントと連携

### 2. Vercel KVデータベースの作成

1. Vercel Dashboard → Storage → Create Database
2. KV (Redis) を選択
3. データベース名を入力（例: `quiz-app-kv`）
4. リージョンを選択（推奨: Tokyo）
5. 作成完了後、接続情報をメモ：
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

### 3. リポジトリのデプロイ

1. Vercel Dashboard → Add New Project
2. GitHubリポジトリを選択
3. プロジェクト設定：
   - Framework Preset: Next.js
   - Root Directory: `quiz-app` (サブディレクトリの場合)
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### 4. 環境変数の設定

Vercel Dashboard → Settings → Environment Variables で以下を設定：

#### 必須環境変数

```env
KV_REST_API_URL=https://your-kv-xxx.kv.vercel-storage.com
KV_REST_API_TOKEN=your_kv_token_here
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_only_token_here
ADMIN_SECRET=your_secure_admin_password_here
```

#### オプション環境変数

```env
EVENT_TTL_SEC=86400
SPEED_BONUS_MAX=50
TIME_LIMIT_DEFAULT=20
```

### 5. カスタムドメインの設定（オプション）

1. Vercel Dashboard → Domains
2. Add Domain → カスタムドメインを入力
3. DNS設定でVercelを指すよう設定
4. SSL証明書の自動発行を確認

## 本番環境での確認事項

### デプロイ後のテスト

1. **基本機能テスト**
   - ホームページの表示確認
   - 各画面への遷移確認
   - レスポンシブデザインの確認

2. **管理機能テスト**
   - `/host` へのアクセス
   - 管理者ログイン
   - イベント作成
   - 問題登録

3. **参加者機能テスト**
   - `/join` での参加登録
   - `/play` での回答
   - モバイル端末での動作確認

4. **データベース接続テスト**
   - KV接続の確認
   - データの読み書き確認
   - TTLの動作確認

### パフォーマンス最適化

1. **Core Web Vitals確認**
   - Lighthouse スコアの確認
   - PageSpeed Insights での測定

2. **API レスポンス確認**
   - 各APIエンドポイントの応答時間
   - タイムアウトの設定確認

3. **キャッシュ設定**
   - 静的アセットのキャッシュ
   - API のキャッシュポリシー

## 運用時の注意事項

### セキュリティ

- `ADMIN_SECRET` は十分に複雑なパスワードを設定
- 定期的にパスワードを変更
- 不正アクセスのログ監視

### 監視・ログ

- Vercel Dashboard → Functions → Logs でエラー監視
- アクセス数とパフォーマンスの定期確認
- 異常なアクセスパターンの検知

### バックアップ・復旧

- KVデータは自動でレプリケーション
- 重要なイベントデータは事前にCSVエクスポート
- 緊急時の連絡先・手順を整備

## トラブルシューティング

### よくある問題

**❌ ビルドエラー**
```
Error: Cannot resolve module '@vercel/kv'
```
**✅ 解決方法**
```bash
npm install @vercel/kv
```

**❌ KV接続エラー**
```
Error: Failed to connect to KV
```
**✅ 解決方法**
- 環境変数の値を確認
- KVデータベースの状態確認
- トークンの有効期限確認

**❌ 管理画面ログイン失敗**
```
Error: 認証が必要です
```
**✅ 解決方法**
- `ADMIN_SECRET` 環境変数の設定確認
- ブラウザキャッシュのクリア

### ログの確認方法

```bash
# Vercel CLI でのログ確認
vercel logs [deployment-url]

# リアルタイムログ
vercel dev
```

### パフォーマンス問題

- Vercel Analytics での詳細分析
- 関数の実行時間最適化
- データベースクエリの最適化

## アップデート手順

### コードアップデート

1. 開発環境での動作確認
2. GitHubにプッシュ
3. Vercelでの自動デプロイ確認
4. 本番環境での動作テスト

### 依存関係のアップデート

```bash
# セキュリティアップデート確認
npm audit

# パッケージ更新
npm update

# 重要なセキュリティ修正
npm audit fix
```

## 緊急時対応

### サービス停止

1. Vercel Dashboard → Deployments
2. 問題のあるデプロイメントを特定
3. 前の安定バージョンへロールバック

### データ復旧

1. KVデータは自動バックアップ
2. 必要に応じてVercelサポートに連絡
3. CSVエクスポートデータからの手動復旧

### 連絡先

- Vercel サポート: https://vercel.com/support
- 緊急時連絡先: [管理者情報を記載]

---

**注意**: 本番環境での作業は慎重に行い、必ず事前にテスト環境で確認してください。