# 公式NEWS 全件監査（2026-07-24）

未調査だった75組を公式サイト、robots.txt、一覧到達、実記事抽出の順にローカル監査した。設定は `src/lib/officialNewsRegistry.ts` に保存し、禁止・保留も再調査を重複しないよう理由付きで残した。本番書き込み、push、deployは実施していない。

## 結果

- 実記事抽出まで合格・有効化: 50組
- 主要AI crawlerをrobots.txtで禁止・無効: 12組
- 公式サイトは許可だが、参照先APIがrobots.txtで禁止・無効: 1組（YOASOBI）
- 公式サイト到達済みだが安全な実記事取得を確定できず無効: 12組
- 未調査: 0組

既存18設定を合わせると、公式NEWS設定は93組、そのうち有効は66組。

## robots.txt禁止（12組）

乃木坂46、Snow Man、ACEes、NEWS、嵐、THE RAMPAGE、なにわ男子、Kis-My-Ft2、NEXZ、ALPHA DRIVE ONE、中島健人、KAT-TUN。

禁止を回避する実装は行っていない。今後の扱いはまとめて決定する。

## 専用API・RSS・個別解析の再調査結果

- 有効化: SEVENTEEN（onclick型static_html、20件合格）、DOH KYUNG SOO（公式RSS、10件合格）、IVE（公開static_html、10件合格）
- 共有サイトの取得方式まで確定・直近対象記事なし: Roselia、秘密結社holoX、桃鈴ねね、うらたぬき
- 現在公式NEWSが0件: ROIROM
- 外部データ元のrobots.txt禁止: YOASOBI（公式ページは未ログインで閲覧可能。ただし画面が参照するSony Music公開JSON APIはChatGPT系自動取得を禁止）
- 今回は対応を省く: Stray Kids、山田涼介、Juice=Juice、幾田りら、2PM、BEYOOOOONDS、IMP. および共有NEWSで直近対象記事がない4組、NEWSが0件のROIROM

`npm.cmd run discover:official-news:pending` でcandidate状態を一括調査できる。同一URLは1回だけ取得し、RSS、WordPress、埋め込みJSON、静的HTML、公式JS内の公開GET候補、現在0件を分類する。結果だけで自動有効化はせず、`validateOfficialNewsConfig.mts` の安全ゲートに合格した設定のみ有効化する。

## 安全条件

- 一覧取得前と詳細取得前にrobots.txtを確認する。
- 自動HTML抽出は同一サイト内かつNEWS系パスのリンクだけを対象にする。
- 短いナビ文言を記事として扱わない。
- 共有サイトはアーティスト名フィルターを中央適用する。
- 1サイトの失敗で全体を止めず、DBエラーを成功扱いにしない。
