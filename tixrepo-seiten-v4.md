# ちけレポ（TixRepo）プロジェクト正典 v4

> この文書は、現在のTixRepo実装・実行基盤・未反映作業を固定する正典です。
> v3までの整理履歴は `tixrepo-seiten-v3.md` を参照してください。
>
> 最終更新：2026-07-23（アーティストページ基盤・公式NEWS commit前ゲート）

---

## 1. データと実行基盤の正本

- アーティスト基本情報の正本は `src/lib/artists.ts` の `ARTISTS`。`slug`, `name`, `genre`, `description`, `keywords`, 表示色、任意の `heroImage`, 任意の `officialNews` をここで管理する。
- 公演取得は `vercel.json` の `/api/cron/fetch-events` をVercel Cronから週1回実行する。公式NEWSはこの経路では実行しない。
- 公式NEWS取得は `.github/workflows/official-news.yml` から `scripts/crawlOfficialNews.mts` を実行する。同一処理のVercel Cronルートは存在しない。
- 取得確認済みの既存13組は、従来の7 parserGroupを `special` strategyとして維持する。URL・parserGroup・enabledは `artists.ts` の定義から生成する。
- 新規公式NEWSサイトは `rss`, `wordpress`, `json_api`, `embedded_json`, `sitemap`, `static_html` の共通strategyを優先し、共通化できない特殊サイトだけspecial parserを追加する。
- 表示側に公式NEWS用slug allowlistは置かない。`artists.ts` に登録済みならNEWS一覧ページを表示でき、0件なら空状態にする。

---

## 2. 新規アーティスト登録後の自動反映

`artists.ts` に基本情報を1件登録すると、アーティストページ、メタデータ/OG、共通または個別ヒーロー画像、0件時の投稿待ち表示が成立する。公演crawlerがタイトルを `name` と `keywords` で一意に特定できた公演には `events.artist_slug` が保存され、ページ再読込で次が更新される。

- ヒーローの次回1公演（タイトル・日付・会場）
- 開催予定の公演と日付・会場カード
- 過去公演
- 当落・座席・現地レポの投稿フォームに出す対象公演
- DB投稿に基づく当選率・アリーナ率などの集計
- 座席報告、現地レポ、ファン座席予想図の実データ表示または投稿待ち

`officialNews` を有効なstrategy設定とともに登録し、GitHub Actionsのcrawlerが記事を保存すると、アーティストTOPの最新3件と `/artists/[slug]/news` の一覧へ反映される。TOPは0件なら非表示、一覧は0件メッセージを表示する。

---

## 3. 初回手動設定とUGC

初回だけ手動で必要なのは、`artists.ts` の基本情報、必要に応じた `public` 配下の個別ヒーロー画像、公式NEWSサイトの調査・strategy設定・取得検証である。公演タイトルが複数アーティストへ一致する場合は自動紐付けせず、crawlerレポートまたはbackfill dry-runを人が確認する。

次の中身は自動生成しないUGCであり、ユーザー投稿が必要である。

- 当落・座席報告
- 現地レポと写真
- ファン座席予想図と投票
- セトリ

UGCが0件の場合、各セクションは架空値や0%を作らず、投稿待ちまたは集計値 `--` を表示する。
セトリは `/artists/[slug]/setlist` で閲覧・追加し、アーティストTOPにはセトリ募集・概要を表示しない。

---

## 4. ページ名とURL

| ページ/機能 | URL | 位置づけ |
|---|---|---|
| TOP・検索入口 | `/` | サイト入口 |
| 検索 | `/search` | アーティスト・公演検索 |
| アーティストTOP | `/artists/[slug]` | 次回公演、開催予定、過去公演、集計、UGC、公式ニュース |
| 公式ニュース一覧 | `/artists/[slug]/news` | 公式記事タイトル・日付・カテゴリ・概要・外部リンク |
| 現地レポ一覧 | `/artists/[slug]/after-reports` | アーティスト単位の現地レポ一覧 |
| セトリ | `/artists/[slug]/setlist` | 公演別セトリの閲覧・追加 |
| 投稿メニュー | `/report` | 投稿入口 |
| 当落・座席投稿 | `/report/ticket` | 当落・座席報告フォーム |
| 現地レポ投稿 | `/report/live` | 現地レポフォーム |
| 公演詳細 | `/events/[id]` | 1公演を軸に座席報告マップとファン座席予想図を閲覧する公演単位ページ |
| 予想図投稿 | `/events/[id]/fan-seat-prediction` | 対象公演への予想図投稿 |

`/events/[id]` はアーティストTOPの代替ではなく、event IDで1公演を特定する座席情報ページである。現地レポの正規投稿入口は `/report/live`。

---

## 5. migration 031と本番反映手順

- `supabase/migrations/031_official_news.sql` が公式NEWS本体のpending migration。base tableはservice role専用で、anon/authenticatedには `official_news_public` viewだけを公開し、`article_body` と `normalized_article_url` を公開しない。
- `official_news_crawl_runs` は `supabase/migration-drafts/official_news_crawl_runs.sql` に置いたdraftであり、pending migrationではない。
- migration 031はstagingで隔離検証済みだが、本番DBはまだ無変更。
- 本番反映時は、対象projectが本番であることを明示確認し、migration一覧で031だけがpendingであることを再確認し、バックアップ/復旧手段を確保してから031だけを適用する。適用後にRLS、public viewの投影、service roleの書込み、一意制約、`updated_at` を確認する。
- GitHub ActionsのSecrets/Variablesを登録し、手動dry-runを確認してから本番NEWS実行を有効にする。これらの本番作業は現時点では未実施。

---

## 6. 未実施・未対応

- `events.artist_slug is null` の既存公演に対するbackfillは未実施。`npm run backfill:event-artists` は引数なしでdry-runし、候補slugと理由だけを表示する。本番更新には `--execute` と書込み許可環境変数の両方が必要。
- 既存13組以外の残り82組の公式NEWS設定は未対応。既存の `test` 定義はこの82組の対象外。
- migration 031の本番適用、GitHub Secrets/Variables登録、本番NEWS取得、本番backfill、deployは未実施。本番環境は無変更。
- 複数候補へ一致する公演の手動確認、公式NEWSサイトの初回strategy検証、UGC投稿は引き続き人の操作が必要。

---

## 7. 本番反映前のローカル確認

```powershell
npx tsc --noEmit
npm run typecheck:crawler
npm run test:artist-platform
npm run test:crawler-safety
npm run build
git diff --check
```

DB更新、commit、push、deployは、対象差分と上記検証結果を確認した後に別作業として行う。
