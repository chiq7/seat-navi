# 公式NEWS 全件監査（2026-07-24、2026-07-25更新）

未調査だった75組を公式サイト、robots.txt、一覧到達、実記事抽出の順にローカル監査した。設定は `src/lib/officialNewsRegistry.ts` に保存し、保留も再調査を重複しないよう理由付きで残した。初回監査後に公開API・RSS・静的HTML等の専用設定を追加検証し、2026-07-25の本番状況まで追補した。

## 結果

- 実記事抽出まで合格・有効化: 62組
- 公式サイト到達済みだが現行の安全な取得方式では実記事0件: 12組
- 公開NEWS一覧なし: 1組（ALPHA DRIVE ONE）
- 未調査: 0組

既存18設定を合わせると、公式NEWS設定は93組、そのうち有効は79組。

## 現在の専用対応候補（12組）

Stray Kids、Roselia、山田涼介、Juice=Juice、幾田りら、秘密結社holoX、2PM、桃鈴ねね、うらたぬき、BEYOOOOONDS、IMP.、ROIROM。

ログイン、CAPTCHA、アクセス制限の回避は行わない。現在の公開ページ・公開API・RSSで安全に実記事を確定できないサイトは無効のまま理由を保持する。

## 専用API・RSS・個別解析の再調査結果

- 有効化例: SEVENTEEN（onclick型static_html）、DOH KYUNG SOO（公式RSS）、IVE（公開static_html）、YOASOBI（公開static_html）、乃木坂46（公式ページが利用する公開JSON API）。
- STARTO共通公開NEWS、Sony Music系公開情報、WordPress、RSS、JSON/JSONP、静的HTMLの確認済み設定を共通crawlerへ統合した。
- KAT-TUNは設定有効だが現在保存記事0件。ALPHA DRIVE ONEは公開NEWS一覧がないため待機。

`npm.cmd run discover:official-news:pending` でcandidate状態を一括調査できる。同一URLは1回だけ取得し、RSS、WordPress、埋め込みJSON、静的HTML、公式JS内の公開GET候補、現在0件を分類する。結果だけで自動有効化はせず、`validateOfficialNewsConfig.mts` の安全ゲートに合格した設定のみ有効化する。

## 安全条件

- 一覧取得前と詳細取得前にrobots.txtを確認する。
- 自動HTML抽出は同一サイト内かつNEWS系パスのリンクだけを対象にする。
- 短いナビ文言を記事として扱わない。
- 共有サイトはアーティスト名フィルターを中央適用する。
- 1サイトの失敗で全体を止めず、DBエラーを成功扱いにしない。

## 2026-07-25 本番確認

- `official_news`: 296件・78組
- `official_news_public`: 296件
- `(artist_slug, normalized_article_url)` の重複: 0件
- イベント候補65記事: 保留0件
- `events`: 510件
- 試写会・映画館上映・展示・オンラインミーグリはNEWSだけを保持し、将来の専用ページまで公演一覧には反映しない。
