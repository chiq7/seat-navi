# ちけレポ (TixRepo)

ライブ座席の体験価値を可視化するWebアプリケーション。

座席番号から「どれくらい神席だったか」がわかる。花道・トロッコ・ファンサ率が見える。AIが自然に質問してデータを集める。

## 技術スタック

- **フロントエンド**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **バックエンド/DB**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **デプロイ**: Vercel

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. 環境変数設定

`.env.local.example` を `.env.local` にコピーして値を設定:

```bash
cp .env.local.example .env.local
```

必要な環境変数:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase プロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名キー
- `OPENAI_API_KEY` - OpenAI APIキー

### 3. Supabase セットアップ

Supabase ダッシュボードの SQL Editor で以下を実行:
1. `supabase/migrations/001_initial.sql` (テーブル作成)
2. `supabase/seed.sql` (サンプルデータ)

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

## ページ構成

| パス | 説明 |
|------|------|
| `/` | トップページ (検索、ランキング、ジャンル別) |
| `/venue/[id]` | 会場ページ (セクション一覧) |
| `/venue/[id]/section/[sectionId]` | セクション詳細 (統計+コメント) |
| `/venue/[id]/section/[sectionId]/post` | 体験投稿フォーム |
| `/chat` | AIチャット |

## 機能

- 会場検索 (インクリメンタルサーチ)
- 人気会場ランキング TOP10
- ジャンル別一覧 (K-POP / ジャニーズ / 女性アイドル / 男性アイドル)
- セクション別統計 (花道遭遇率 / トロッコ遭遇率 / 双眼鏡必要率 / ファンサ率)
- 体験投稿 (5問アンケート + 自由コメント)
- ネタバレON/OFFスイッチ
- AIチャット (座席体験について質問・データ収集)
- スマホファーストUI

## デプロイ (Vercel)

```bash
npm run build  # ビルド確認
vercel          # Vercel にデプロイ
```

環境変数はVercelダッシュボードで設定してください。
