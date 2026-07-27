# 公式NEWS 全件監査（2026-07-24、2026-07-27更新）

未調査だった75組を公式サイト、robots.txt、一覧到達、実記事抽出の順にローカル監査した。設定は `src/lib/officialNewsRegistry.ts` に保存し、保留も再調査を重複しないよう理由付きで残した。初回監査後に公開API・RSS・静的HTML等の専用設定を追加検証し、2026-07-25の本番状況まで追補した。

## 結果

- 実記事抽出まで合格・有効化: 60組
- 公式サイト到達済みだが現行の安全な取得方式では実記事0件: 14組
- 公開NEWS一覧なし: 1組（ALPHA DRIVE ONE）
- 未調査: 0組

既存18設定を合わせると、公式NEWS設定は93組、そのうち有効は77組。

## 2026-07-27 ドメイン所有関係の再監査

93組すべての一覧URL、内部API/RSS URL、保存済み311記事の遷移先ドメインとタイトルを再照合した。アーティスト名がホスト名に含まれるかだけでは判定せず、専用パス、共有基盤のアーティストID、記事名フィルターまで確認した。

- 67組: 他設定と共有しない公式ホストまたは専用サブドメイン。
- 26組: 下表の9共有ドメイン・外部公式APIを利用。アーティスト固有パス、ID、名前フィルターのいずれかを必須とする。
- NiziU: 表示元は `niziu.com`、内部取得先はSony Musicの `/artist/niziu/` 専用API・記事パス。別アーティストのサイトではない。
- ACEes: 旧 `starto.jp` の `artist=105` はACEesではなく、WEST.等の別アーティスト記事を返していた。正しいジュニア公式（group 21）へ参照元を直し、安全な専用抽出が完成するまで無効化した。
- 記事ではない共通ナビ6件（FANTASTICS 2、M!LK 1、BIGBANG 1、BOYNEXTDOOR 1、(G)I-DLE 1）も発見。各サイトの記事URL許可ルールと共通ナビ除外を追加した。FANTASTICSは正規記事をサーバーHTMLから取得できないため無効化した。

| 共有基盤 | 対象 | 所有関係の判定 |
| --- | --- | --- |
| Sony Music | NiziU、NEXZ、YOASOBI、中島健人 | `/artist/<artist>/` または `/PR/YOASOBI/` の専用API・記事パス |
| STARTO | NEWS、嵐、KAT-TUN | 一覧の `artist` / `tag` 固有ID。ACEesの誤IDは廃止 |
| MENT RECORDING | Snow Man、Kis-My-Ft2 | `/snowman/`、`/kismyft2/` 専用パス |
| Universal Music | しぐれうい、King & Prince、Ado、Travis Japan | アーティスト専用パス |
| YGEX | TREASURE、BIGBANG、BLACKPINK、iKON | アーティスト専用パス。BIGBANGは20周年NEWS詳細だけ許可 |
| Warner Music Japan | Number_i、うらたぬき、CHANMINA | 専用パス。共有USSSは名前フィルター付き・現在無効 |
| NCT Japan | NCT WISH、NCT DREAM | 共有NEWSを各グループ名で必須フィルター |
| Hello! Project | Juice=Juice、BEYOOOOONDS | アーティスト専用パス・現在無効 |
| hololive production | 秘密結社holoX、桃鈴ねね | 共有NEWSを名前フィルター・現在無効 |
| その他共有公式 | FANTASTICS、なにわ男子 | `group_id=168`、`arti=J0011` の固有ID |

## 現在の専用対応候補（14組）

ACEes、FANTASTICS、Stray Kids、Roselia、山田涼介、Juice=Juice、幾田りら、秘密結社holoX、2PM、桃鈴ねね、うらたぬき、BEYOOOOONDS、IMP.、ROIROM。

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
