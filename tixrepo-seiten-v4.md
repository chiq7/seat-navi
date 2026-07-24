# ちけレポ（TixRepo）プロジェクト正典 v4

> この文書は、現在のTixRepo実装・実行基盤・未反映作業を固定する正典です。
> v3までの整理履歴は `tixrepo-seiten-v3.md` を参照してください。
>
> 最終更新：2026-07-24（アーティストページ基盤・公式NEWS本番反映後）

---

## 1. データと実行基盤の正本

- アーティスト基本情報の正本は `src/lib/artists.ts` の `ARTISTS`。`slug`, `name`, `genre`, `description`, `keywords`, 表示色、任意の `heroImage`, 任意の `officialNews` をここで管理する。
- 公演取得は `vercel.json` の `/api/cron/fetch-events` をVercel Cronから週1回実行する。公式NEWSはこの経路では実行しない。
- 公式NEWS取得は `.github/workflows/official-news.yml` から `scripts/crawlOfficialNews.mts` を実行する。同一処理のVercel Cronルートは存在しない。
- 取得確認済みの旧13組は、従来の7 parserGroupを `special` strategyとして維持する。URL・parserGroup・enabledは `artists.ts` の定義から生成する。
- ローカルではONE OK ROCKを `rss`、あいみょん・back number・Mrs. GREEN APPLEを `static_html` の共通strategyで追加検証済み。旧special parserには混ぜない。
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

## 5. migration 031と公式NEWSの本番状況

- `supabase/migrations/031_official_news.sql` は本番適用済み。base tableはservice role専用で、anon/authenticatedには `official_news_public` viewだけを公開し、`article_body` と `normalized_article_url` を公開しない。
- `official_news_crawl_runs` は `supabase/migration-drafts/official_news_crawl_runs.sql` に置いたdraftであり、pending migrationではない。
- 本番適用後にtable/view、RLS、権限、一意制約、非公開列を確認済み。既存schemaと既存データへの意図しない変更はない。
- GitHub ActionsのSecrets/Variablesは登録済み。BE:FIRSTを除く12組を対象に、週次production実行を有効化済み。
- 2026-07-24確認時点の本番 `official_news` は55件・12組で、`(artist_slug, normalized_article_url)` の重複は0件。`official_news_public` から同じ55件を参照できる。
- 1回の新規処理上限は15件。`limit_deferred` は別記事を次回へ繰り越す安全機構であり、同一記事の重複追加ではない。

---

## 6. 未実施・未対応

- `events.artist_slug is null` の既存公演backfillは21件を本番更新済み。更新後のdry-runは `matched=0 / ambiguous=0`。`npm run backfill:event-artists` は引数なしでは引き続きdry-runとして動作する。
- 旧13組以外の82組のうち、ONE OK ROCK、あいみょん、back number、Mrs. GREEN APPLEの4組はローカル取得検証済みで、本番反映前。NiziUはデータ元Sony Music、日向坂46・櫻坂46は各公式サイトのrobots.txtがAI crawlerを禁止するため有効化しない。残り未調査は75組。既存の `test` 定義はこの集計の対象外。
- 共通JSON API strategyはJSONP、入れ子フィールド、相対URLに対応したが、robots.txt禁止を回避するためには使わない。static HTML一覧で年が省略される場合は、詳細ページの公開日で補完する。
- BE:FIRSTはローカル取得に成功するがGitHub RunnerからHTTP 403となるため、公式NEWS取得だけ一時無効。アーティストページと公演機能は有効のまま。
- `official_news_crawl_runs` のmigration、migration baseline整理、032適用は未実施。
- 複数候補へ一致する公演の手動確認、新規公式NEWSサイトの初回strategy検証、UGC投稿は引き続き人の操作が必要。

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

---

## 8. 現在の完成範囲とログイン計画

- 現在のヒーロー画像と画像フォールバックは完成扱い。全アーティスト分の追加画像作成は行わない。
- 現在の座席予想と現地レポの詳細表示は完成扱い。新しい不具合がない限りUIを変更しない。
- ログイン／マイページは、ログイン以外の全実装が完了した後の最終工程として着手する。それまでは認証パッケージの追加や認証コードの実装も行わない。現時点ではトップのログインCTAだけがあり、Supabase Authの認証ロジック、ログイン画面、セッション維持、ログアウト、マイページは未実装。
- 実装時はSupabase AuthとNext.jsのCookieベースSSRを使用し、Googleログイン、ログアウト、簡単なマイページを先に完成させる。
- お気に入りアーティストと推し優先表示には、ユーザー所有権を持つテーブルとRLSが必要。認証基盤完成後の別migrationとして設計する。
