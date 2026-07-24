# 公式NEWS 全件監査（2026-07-24）

未調査だった75組を公式サイト、robots.txt、一覧到達、実記事抽出の順にローカル監査した。設定は `src/lib/officialNewsRegistry.ts` に保存し、禁止・保留も再調査を重複しないよう理由付きで残した。本番書き込み、push、deployは実施していない。

## 結果

- 実記事抽出まで合格・有効化: 47組
- 主要AI crawlerをrobots.txtで禁止・無効: 12組
- 公式サイト到達済みだが汎用抽出で記事0件・無効: 16組
- 未調査: 0組

既存18設定を合わせると、公式NEWS設定は93組、そのうち有効は63組。

## robots.txt禁止（12組）

乃木坂46、Snow Man、ACEes、NEWS、嵐、THE RAMPAGE、なにわ男子、Kis-My-Ft2、NEXZ、ALPHA DRIVE ONE、中島健人、KAT-TUN。

禁止を回避する実装は行っていない。今後の扱いはまとめて決定する。

## 専用API・RSS・個別解析待ち（16組）

Stray Kids、SEVENTEEN、Roselia、山田涼介、YOASOBI、Juice=Juice、幾田りら、秘密結社holoX、2PM、IVE、桃鈴ねね、うらたぬき、DOH KYUNG SOO、BEYOOOOONDS、IMP.、ROIROM。

これらはrobots.txt上の取得禁止ではない。SSR HTMLに実記事リンクがない、埋め込みJSON、共有サイト内に直近該当記事がない、現在公式NEWSが0件、のいずれか。誤記事を保存しないため、有効化せず専用対応へ回した。

## 安全条件

- 一覧取得前と詳細取得前にrobots.txtを確認する。
- 自動HTML抽出は同一サイト内かつNEWS系パスのリンクだけを対象にする。
- 短いナビ文言を記事として扱わない。
- 共有サイトはアーティスト名フィルターを中央適用する。
- 1サイトの失敗で全体を止めず、DBエラーを成功扱いにしない。
