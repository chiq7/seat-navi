# 新規アーティスト追加手順

## 1. アーティスト定義

`src/lib/artists.ts` の `ARTISTS` に1件追加します。必須項目は `slug`, `name`, `genre`, `description`, `keywords`, `initials`, `grad`, `accentColor`, `accentDark` です。`heroImage` と `officialNews` は任意です。架空データは本番定義へ残さず、テストではfixtureを使います。

## 2. ヒーロー画像

画像は `public/images/artists/<slug>.<拡張子>` など `public` 配下へ置き、定義には `/images/artists/<slug>.<拡張子>` を指定します。未指定、空文字、読込失敗時は `/images/hero/artist-top.png` が使われます。

## 3. 公演の自動紐付け

会場crawlerが抽出したタイトルを、全アーティストの `name` と `keywords` に共通のNFKC正規化・境界判定で照合します。候補が1組だけなら `events.artist_slug` を保存します。genreは判定に使いません。候補なし、または複数候補ならnullのままです。既存の明示slugは上書きしません。

## 4. 曖昧な公演の確認

crawlerレポートの `artistAssociations` を確認します。既存の未紐付け公演は次のdry-runで候補と理由を確認できます。

```powershell
npm run backfill:event-artists
```

更新は `--execute` に加えて `EVENT_ARTIST_BACKFILL_ALLOW_PRODUCTION_WRITE=true` が必要です。本番反映前はdry-runだけを使用してください。

## 5. 公式ニュース設定

同じアーティスト定義の `officialNews` に `newsUrl`, 共通 `strategy`, `verificationStatus`, `enabled`, `notes` とstrategy固有設定を追加します。全件監査でまとめて管理する設定は `src/lib/officialNewsRegistry.ts` に追加し、アーティスト定義へ自動統合します。公式表記だけページ名と異なる場合は `artistName` も指定します。新規サイトは `rss` / `wordpress` / `json_api` / `embedded_json` / `sitemap` / `static_html` / `auto_html` の共通strategyを優先し、共通化できない特殊サイトだけ `parserGroup` を指定します。既存13組はspecial parserを維持します。共有NEWSサイトでは `articleRules.includeAny` で対象アーティストの記事だけに限定します。表示側のslug allowlist追加は不要です。NEWSが0件でも `/artists/<slug>/news` は空状態で表示されます。

## 6. 自動更新される項目

ページとSEO、ヒーロー、次回公演、開催予定カード、過去公演、投稿フォームの公演候補、DB投稿を基にした集計・タイムライン・マップ・現地レポ、公式ニュースTOP3件と一覧がページ再読込時に更新されます。セトリは既存の `/artists/<slug>/setlist` で扱い、アーティストTOPには表示しません。

## 7. ユーザー投稿が必要な項目

当落、座席、現地レポ、ファン座席予想図、予想図への投票、セトリ内容は自動生成しません。0件時は各セクションの投稿待ち表示になります。

## 8. 本番反映前の確認

```powershell
npx tsc --noEmit
npm run typecheck:crawler
npx eslint src/lib/artists.ts src/lib/artistPageData.ts src/lib/eventTitle.ts src/lib/events.ts src/lib/eventCrawler.ts src/lib/officialNews.ts src/app/artists/[slug]/ArtistClient.tsx src/app/artists/[slug]/news/page.tsx src/app/artists/[slug]/news/layout.tsx src/components/artist-page/HeroSection.tsx src/components/artist-page/UpcomingEventsSection.tsx src/components/artist-page/SetlistSummarySection.tsx scripts/backfill-event-artist-slugs.mts scripts/artistPlatform.test.mts scripts/officialNews/legacySites.ts
npm run test:artist-platform
npm run test:crawler-safety
npm run build
git diff --check
```
