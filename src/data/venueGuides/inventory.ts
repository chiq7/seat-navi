import { VENUES } from "@/lib/eventCrawlerConfig";
import kEvidence from "./k-arena/floor-evidence.json";
const kFloorNames = kEvidence.diagrams.map(diagram => diagram.floor).join("・");
const kMarkCount = kEvidence.diagrams.reduce((total, diagram) => total + diagram.landmarks.length, 0);

export type VenueGuideInventory = {
  venueId: string;
  name: string;
  status: "existing" | "partial" | "research" | "blocked";
  checkedAt: string;
  officialUrl: string;
  seatUrl?: string;
  floorUrl?: string;
  accessUrl?: string;
  evidence: "read" | "unavailable" | "local-existing";
  seatCoverage: string;
  imageAvailability: string;
  stationExits: string;
  gates: string;
  facilities: string;
  baggagePayment: string;
  eventDependency: string;
  blocker: string;
  diagramRights: "existing-independent" | "publish-use-unconfirmed" | "not-reviewed";
  uiQa: "pending" | "partial";
};

type Candidate = { id: string; home: string; seat?: string; floor?: string; access?: string; note?: string; unavailable?: boolean };
const candidates: Candidate[] = [
  { id: "tokyo-dome", home: "https://www.tokyo-dome.co.jp/dome/", seat: "https://www.tokyo-dome.co.jp/dome/seat/", note: "既存専用ガイド・9/29最新決定を保護。32ゲートの位置など既存の未確認点は維持" },
  { id: "kyocera-dome", home: "https://www.kyoceradome-osaka.jp/", seat: "https://www.kyoceradome-osaka.jp/seat/", floor: "https://www.kyoceradome-osaka.jp/floor_guide/f3/", access: "https://www.kyoceradome-osaka.jp/access/" },
  { id: "vantelin-dome", home: "https://www.nagoya-dome.co.jp/", seat: "https://www.dragons.co.jp/seatsearch2020/ss2026.html", floor: "https://dragons.jp/nagoyadome/facilities/", access: "https://www.nagoya-dome.co.jp/enjoy/access.php", note: "座席・場内・場外・荷物を一次接続。追加番号と特殊席の精密対応・未確定条件・全条件確認は後段" },
  { id: "paypay-dome", home: "https://www.softbankhawks.co.jp/stadium/", note: "座席・場内・場外・荷物を一次接続し基本確認。追加番号・特殊席・精密位置と全条件確認は後段" },
  { id: "sapporo-dome", home: "https://www.sapporo-dome.co.jp/", floor: "https://www.sapporo-dome.co.jp/guide/", note: "公式フロア・座席案内あり。野球／サッカー／公演のモードを分ける必要あり" },
  { id: "belluna-dome", home: "https://bellunadome.seibulions.co.jp/", floor: "https://bellunadome.seibulions.co.jp/guide/", note: "2026常設席・場内・敷地・駅/店舗の荷物を一次接続。追加番号・特殊席と精密入口/経路は後段" },
  { id: "zozo-marine", home: "https://www.marines.co.jp/stadium/", floor: "https://www.marines.co.jp/stadium/ballpark/guidemap.html", note: "公式球場マップあり。野球配置から公演時の配置を推測しない" },
  { id: "koshien", home: "https://koshien.hanshin.co.jp/", seat: "https://koshien.hanshin.co.jp/stadium_seat/", note: "公式座席入口を確認。ライブ時の開放範囲・列は未照合" },
  { id: "mufg-stadium", home: "https://jns-e.com/", seat: "https://jns-e.com/seat/", floor: "https://jns-e.com/map/", note: "公式座席・フロア図あり。改修によるブロック表記の違いと開催回の整合確認が必要" },
  { id: "nissan-stadium", home: "https://www.nissan-stadium.jp/", floor: "https://www.nissan-stadium.jp/floor/", note: "公式フロア入口あり。画像内の席区画・列・入口は未転記" },
  { id: "saitama-super-arena", home: "https://www.saitama-arena.co.jp/", seat: "https://www.saitama-arena.co.jp/seats_info/", floor: "https://www.saitama-arena.co.jp/floor_map/arena.html", access: "https://www.saitama-arena.co.jp/access/train.html", note: "アリーナ／スタジアムの扉付近・2F設備・場内外荷物をローカル接続。改修後の配置は未確認" },
  { id: "yokohama-arena", home: "https://www.yokohama-arena.co.jp/", seat: "https://www.yokohama-arena.co.jp/seatguide/astage.html", floor: "https://www.yokohama-arena.co.jp/floormap/1f.html", access: "https://www.yokohama-arena.co.jp/access/", note: "A・B・中央の公式パターンあり。Aを全公演の既定配置にしない。各詳細図の転記は未実施" },
  { id: "pia-arena-mm", home: "https://pia-arena-mm.jp/", seat: "https://pia-arena-mm.jp/seatmap/index.html", note: "公式座席案内を確認。無断転載禁止表示あり。画像は掲載せず独自図か公式リンクで対応" },
  { id: "ariake-arena", home: "https://ariake-arena.tokyo/", seat: "https://ariake-arena.tokyo/wp-content/themes/ariake-arena/assets/images/page/riyoannai.pdf", floor: "https://ariake-arena.tokyo/floor/", access: "https://ariake-arena.tokyo/access/", note: "公式資料取得済み。A〜H常設席・各階設備・場内外荷物をローカル接続" },
  { id: "budokan", home: "https://www.nipponbudokan.or.jp/", note: "公式入口を確認。常設の座席区画・列資料は未確認。クローラー無効をガイド対象外にしない" },
  { id: "yoyogi", home: "https://www.jpnsport.go.jp/yoyogi/", seat: "https://www.jpnsport.go.jp/yoyogi/seat/tabid/61/Default.aspx", note: "公式座席入口あり。第一体育館の図・列と、公演アリーナを分けて照合が必要" },
  { id: "makuhari-messe", home: "https://www.m-messe.co.jp/", floor: "https://www.m-messe.co.jp/facility/", note: "イベントホールと展示ホールを区別。展示ホールには公演共通の固定アリーナ席を作らない" },
  { id: "k-arena", home: "https://k-arena.com/", seat: "https://k-arena.com/seat/", floor: "https://k-arena.com/floor/", access: "https://k-arena.com/access/", note: "常設LEVEL3/5/7の座席と館内57設備、場外20件をローカル接続。公演別アリーナは固定しない" },
  { id: "tokyo-garden-theater", home: "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/", floor: "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/visitor/floor/", note: "バルコニー1/2/3と3/4/5Fを照合。共通の座席・設備・荷物画面をローカル接続" },
  { id: "osaka-jo-hall", home: "https://www.osaka-johall.com/", seat: "https://www.osaka-johall.com/seat/", floor: "https://www.osaka-johall.com/floorguide/", access: "https://www.osaka-johall.com/access/" },
  { id: "edion-arena", home: "https://www.furitutaiikukaikan.ne.jp/", floor: "https://www.furitutaiikukaikan.ne.jp/facilities.php", access: "https://www.furitutaiikukaikan.ne.jp/access.php", note: "現在公式を再取得。2027年1月まで全館休館中、改修前参考図と駅/店舗の現行荷物を区別して一次接続" },
  { id: "marine-messe", home: "https://www.marinemesse.or.jp/messe/", unavailable: true, note: "公式A館入口は取得できるが本文抽出0行。B館と混同せず公式図の別手段での読取りが必要" },
  { id: "miyagi-arena", home: "https://www.mspf.jp/grande21/", note: "メインA〜Zと棟階別設備・場外・荷物を一次接続。追加全列番号・特殊席・精密入口/条件は後段" },
  { id: "hiroshima-arena", home: "https://h-jigyoudan.or.jp/sports-center/", floor: "https://h-jigyoudan.or.jp/sports-center/center-facility/", note: "公式施設案内あり。大アリーナを小アリーナ等と区別し、席・列を照合が必要" },
  { id: "gaishi-hall", home: "https://www.nespa.or.jp/sports-plaza/hall/", floor: "https://www.nespa.or.jp/sports-plaza/hall/floor-map/", note: "公式はNGKスポーツプラザ表記。既存ID・名称設定は変更せず、現行座席図と旧券面を照合が必要" },
  { id: "toki-messe", home: "https://www.tokimesse.com/", floor: "https://www.tokimesse.com/visitor/guide/", note: "公式施設ガイドあり。展示ホールの公演別配置と会議室などを混同しない" },
];

export const venueGuideInventory: VenueGuideInventory[] = candidates.map(candidate => {
  const name = VENUES.find(venue => venue.id === candidate.id)?.name ?? candidate.id;
  const isKyocera = candidate.id === "kyocera-dome";
  const isOsaka = candidate.id === "osaka-jo-hall";
  const isTokyo = candidate.id === "tokyo-dome";
  const isK = candidate.id === "k-arena";
  const isYokohama = candidate.id === "yokohama-arena";
  const isPia = candidate.id === "pia-arena-mm";
  const isGarden = candidate.id === "tokyo-garden-theater";
  if (candidate.id === "toki-messe") return {
    venueId:candidate.id,name,status:"partial",checkedAt:"2026-10-10",officialUrl:candidate.home,seatUrl:"https://www.tokimesse.com/sponsor/download/",floorUrl:candidate.floor,accessUrl:"https://www.tokimesse.com/visitor/access/",evidence:"read",
    seatCoverage:"展示ホールA/B・会議場2Fメインホールの3部屋をモード分離。公演別配置なので常設列/番号・サンプル座席を作らない。部屋名検索・選択・ズーム/復帰を接続",
    imageAvailability:"公式各階/展示/メインとMUSIC-MDATA18546配置サンプル・ライブ部別室ページを照合。原図/PDF/ロゴpublic複製なし",
    stationExits:"新潟駅1Fバスターミナル17番からバス約17分/徒歩約25分。旧図のバス乗場を現在の場所へ転用しない。精密駅出口/入口/連続経路は確認中",
    gates:"展示A/B・エントランス2・メイン/アトリウム・敷地/駅の代表区域。公演入口・開放/精密境界は未確定",
    facilities:"場内49/場外11機能・45固定区域・8独立図。会議場/入口/展示場/エスプラナードの階・目的・場所/一覧/詳細と場外3店舗の店名検索を一次接続",
    baggagePayment:"館内3条件（返金式1F28口/2F168口、大型有料8口）と駅3施設を一覧へ接続。佐川2F EAST SIDE・預かり10〜20時/店舗10〜20:30・700円/日。駅ロッカー個別位置/条件・旧西口カウンターの改修後対応/空きは未確定",
    eventDependency:"座席/ステージ/入場口・開放は公演ごと。メインホールを展示場へ混ぜない。サンプルのスタンドを常設席へ昇格しない",
    blocker:"4分野の一次接続。公演別座席・精密入口/駅機械点/未確定条件・全札/全条件/実機多点は後段。公式リンク事前連絡/公開利用は未確認。全確認済み・数値90%ではない",
    diagramRights:"publish-use-unconfirmed",uiQa:"partial",
  } satisfies VenueGuideInventory;
  if (candidate.id === "hiroshima-arena") return {
    venueId:candidate.id,name,status:"partial",checkedAt:"2026-10-10",officialUrl:candidate.home,seatUrl:"https://h-jigyoudan.or.jp/sports-center/center-facility/",floorUrl:"https://h-jigyoudan.or.jp/sports-center/center-facility/",accessUrl:"https://h-jigyoudan.or.jp/sports-center/center-overview/",evidence:"read",
    seatCoverage:"大アリーナA〜J・83通路分離参考範囲。F/G14〜27の28列帯290キーのみ部分検索。全物理全数・全席ではない。小アリーナ/可動席/貴賓/公演配置は後段",
    imageAvailability:"現在公式リンクの固定席/棟階別フロアとLiveWalker20191120を主要比較。原図/PDF/ロゴのpublic複製なし",
    stationExits:"県庁前西2（基町クレド側）、バスセンター/紙屋町、紙屋町西/原爆ドーム前。広島駅から10/15分は乗車時間。精密連続経路未確定",
    gates:"A〜Jは座席図の参考ゲート。公演指定入口・正確な敷地境界/駅出口座標は確認中",
    facilities:"8棟階の場内69/場外9機能・47固定区域・10独立区域図/札。トイレ/授乳/食品自販機/AED/案内、階・目的・場所一覧/詳細・店名検索を一次接続",
    baggagePayment:"館内13口の300/400円・21時制限。場外ロッカー3区域/有人2施設、バスセンター5:30〜24時と有人9〜20時、Crosta9〜20時/1000円。県庁前/本通の個別位置/料金・空きは未確定",
    eventDependency:"11/9等の施設整備日は利用/受付不可。固定番号が公演で変わる場合あり。可動/アリーナ・開放/入場境界は主催者確認",
    blocker:"4分野の一次接続。追加全列番号/特殊席・精密敷地/入口/経路・未確定条件・全札/全条件/実機多点は後段。全確認済み・数値90%ではない",
    diagramRights:"publish-use-unconfirmed",uiQa:"partial",
  } satisfies VenueGuideInventory;
  if (candidate.id === "miyagi-arena") return {
    venueId:candidate.id,name,status:"partial",checkedAt:"2026-10-10",officialUrl:candidate.home,seatUrl:"https://www.mspf.jp/grande21/seat_guide/arenaseats2f_20140501.pdf",floorUrl:"https://www.mspf.jp/grande21/seat_guide/arenafroa_20260422.pdf",accessUrl:"https://www.mspf.jp/grande21/index.php?action=sisetu_traffic_index",evidence:"read",
    seatCoverage:"メインA〜Z・72参考範囲。G5〜21/T9〜21の30列帯344キーのみ部分検索。全物理全数・全席番号ではない。サブ/特殊席/公演アリーナは後段",
    imageAvailability:"現在公式リンクの2014席図/1F図(図内09.08.20)/パンフレット(図内2021.3)とLiveWalker20260828を主要比較。原図/PDF/ロゴのpublic複製なし",
    stationExits:"利府駅バス約10分・菅谷台4丁目、利府徒歩3km45分/岩切4km60分。精密入口・連続/段差なし経路は確認中",
    gates:"敷地正面ゲート/バス停/第三駐車場を接続。スタジアムゲートをアリーナ入場口へ流用しない。使用入口は公演別",
    facilities:"場内31/場外26機能・33固定区域・7図。メイン/サブ1/2Fと階未確定を分離。トイレ・赤ちゃん・AED・案内・喫茶/飲食境界の一覧/詳細/検索",
    baggagePayment:"サブ1Fロビー等は位置未確定の一覧。競技者用更衣室は一般預かりと分離。仙台駅11ロッカー/有人1を図外接続。改札内/6〜24時/始終電、有人19時まで500〜2000円/個/日を区別。利府/屋外・機械詳細/空きは確認中",
    eventDependency:"10/26〜28停電点検休館予定。大型改修は2029年度へ延期予定、サブ除外。公演の交通/営業・可動席は主催者確認",
    blocker:"4分野の一次接続。追加番号/特殊席・精密入口/条件・全札境界/全条件/実機多点は後段。全確認済み・数値90%ではない",
    diagramRights:"publish-use-unconfirmed",uiQa:"partial",
  } satisfies VenueGuideInventory;
  if (candidate.id === "edion-arena") return {
    venueId:candidate.id,name,status:"partial",checkedAt:"2026-10-10",officialUrl:candidate.home,seatUrl:"https://www.furitutaiikukaikan.ne.jp/images/facilities/floor_3_4_zaseki.jpg",floorUrl:candidate.floor,accessUrl:candidate.access,evidence:"read",
    seatCoverage:"第1競技場A〜Hを38通路分離参考範囲へ接続。B1〜12側11列/108キーのみ部分検索。第2競技場は別モード。再開後/他番号/公演配置は未確認",
    imageAvailability:"現行公式の休館・予約受付と改修前5階図/固定席、LiveWalker作成の補助PDFを主要比較。原図/PDF/ロゴのpublic複製なし",
    stationExits:"地下鉄5番出口350m、南海南出口250m、大阪難波600m、JR800mの公式距離。Metro26-D閉鎖と一部EV停止を保持。精密経路未確定",
    gates:"改修前玄関ホールと駅の場所関係。公演入口・再開後/段差なし連続経路は確認中",
    facilities:"改修前館内28/現行場外31機能・33固定区域・7図。主要トイレ/自販機/救護/案内、階/目的/場所一覧/詳細/店名検索。未掲載AED/赤ちゃんは無効",
    baggagePayment:"南海CITY10/パークス2/Metro2/OCAT6ロッカー区域と有人2店舗の22図外案内。8競技者用更衣室は観客預かりと分離。時間/料金の個別差、Airporter未確定料金・機械内寸/空きは保持",
    eventDependency:"2027年1月まで全館休館。工期/再開日は予定、2/3月予約受付を再開済みと扱わない。改修後の設備・席/開放・公演アリーナは未確認",
    blocker:"休館表示を含む4分野の一次接続。再開後の現行図/追加全列番号/精密入口/条件/全境界/実機多点は後段。全確認済み・数値90%ではない",
    diagramRights:"publish-use-unconfirmed",uiQa:"partial",
  } satisfies VenueGuideInventory;
  if (candidate.id === "makuhari-messe") return {
    venueId:candidate.id,name,status:"partial",checkedAt:"2026-10-10",officialUrl:candidate.home,seatUrl:"https://www.m-messe.co.jp/organizers/support/layout/",floorUrl:candidate.floor,accessUrl:"https://www.m-messe.co.jp/access/",evidence:"read",
    seatCoverage:"イベントホール81参考範囲・通常398列帯/3488印字キー。A/F/BOXの列番号は保留。展示1〜11は別モードの棟輪郭で、公演固定席を作らない",
    imageAvailability:"現在公式リンクの固定席図(図内2006.07.01)とLiveWalker補助図、棟階別の設備・2026年8月ロッカー図を主要比較。原図/PDF/ロゴのpublic複製なし",
    stationExits:"海浜幕張南口約5分は複合会場への目安、幕張豊砂20分、幕張本郷バス17分。指定棟/入口までの精密連続経路は未確認",
    gates:"イベントホールのメイン/東/西、展示場東/中央/西を別棟・階で案内。公演の開放・指定入口を確定しない",
    facilities:"9棟階の主要トイレ・赤ちゃん・AED・案内・5店名、屋外と駅/店舗の場所一覧・個別詳細を部分接続",
    baggagePayment:"館内13/屋外2/駅店舗7のロッカー区域。普通400/500/700円と来場者限定小型300円、8〜20時/24時加算/最大3日を区別。駅の未確定条件と有人個別404は保持",
    eventDependency:"展示場/可動席/アリーナの公演配置、営業・利用境界・開放は主催者確認",
    blocker:"4分野の一次接続。追加列番号/特殊席・精密位置/連続経路・全条件/全境界/実機多点は後段。全確認済みや数値90%ではない",
    diagramRights:"publish-use-unconfirmed",uiQa:"partial",
  } satisfies VenueGuideInventory;
  if (candidate.id === "nissan-stadium") {
    return { venueId: candidate.id, name, status: "partial", checkedAt: "2026-10-10", officialUrl: candidate.home, seatUrl: "https://www.nissan-stadium.jp/floor/sheet.php", floorUrl: "https://www.nissan-stadium.jp/floor/", accessUrl: "https://www.nissan-stadium.jp/access/train.php", evidence: "read",
      seatCoverage: "現行2層・4スタンド・48入口名と311参考範囲を接続。全物理全数・列番号・特殊席精密化は後段",
      imageAvailability: "現行座席/4〜7F/売店/敷地/駅資料とLiveWalker20191007を主要比較。古い特殊席を現行へ転用せず原図/PDF/ロゴのpublic複製なし",
      stationExits: "JR新横浜14分・地下鉄等12分・小机7分。周辺図の10番出口（旧8番）を区別。精密連続/段差なし経路は未確定",
      gates: "東西南北ゲートと48観客席入口を区別。当日使用入口は券面/主催者確認",
      facilities: "4〜7F主要トイレ・おむつ交換・EV・AED・飲食店名と敷地/公園/駅の一覧・詳細を接続。7F凡例からトイレを作らない",
      baggagePayment: "館内対応は主催者別。公園2区域・CUBIC7区域・JR/市営/東急/小机/北新横浜・予約店舗を接続。個別位置/未確定条件/空きは保持",
      eventDependency: "競技常設席と公演アリーナ、イベント営業・入場境界・臨時預かりを区別",
      blocker: "4分野の一次接続。全列番号/特殊席・精密入口/連続経路・全境界/全条件/実機多点は後段。全確認済みや数値90%ではない",
      diagramRights: "publish-use-unconfirmed", uiQa: "partial" } satisfies VenueGuideInventory;
  }
  if (candidate.id === "mufg-stadium") {
    return {venueId:candidate.id,name,status:"partial",checkedAt:"2026-10-10",officialUrl:"https://jns-e.com/",seatUrl:"https://jns-e.com/seat/",floorUrl:"https://jns-e.com/map/",accessUrl:"https://jns-e.com/access/",evidence:"read",
      seatCoverage:"現行公式166ブロックのクリック輪郭と3層/4方向を接続。列/席番号・特殊席/改修中の個別対応は後段。全物理全数ではない",
      imageAvailability:"現行原寸座席/設備/飲食/外周図とLiveWalker20251128補助図を主要比較。原図/PDF/ロゴのpublic複製なし",
      stationExits:"国立競技場A2、JR千駄ケ谷/信濃町、外苑前3番を接続。精密連続/段差なし経路は未確定",
      gates:"公式A〜H8区域とEの2026NTTドコモ名称/旧外苑門の検索を接続。公演使用門は券面/主催者確認",
      facilities:"1F/2F/4Fと5F空の杜の主要トイレ・授乳・AED・案内・32飲食区域を接続。3F改修閉鎖を保持。入口/全記号/全条件は後段",
      baggagePayment:"都営改札外3区域、JR最寄り2駅、新宿2区域と予約店舗を図外一覧へ接続。会場内/敷地一般預かりは未確定。個別機械/料金/時間/空きは保持",
      eventDependency:"常設スタンドと公演アリーナ、改修中の配置/営業/券種境界、空の杜閉鎖を区別",
      blocker:"主要4分野の一次接続。全列番号/特殊席精密化・入口/経路・全境界/全条件/実機多点は後段。数値90%や全確認済みではない",
      diagramRights:"publish-use-unconfirmed",uiQa:"partial"} satisfies VenueGuideInventory;
  }
  if (candidate.id === "koshien") {
    return {venueId:candidate.id,name,status:"partial",checkedAt:"2026-10-10",officialUrl:candidate.home,seatUrl:candidate.seat,floorUrl:"https://koshien.hanshin.co.jp/stadium_guide/map.html",accessUrl:"https://koshien.hanshin.co.jp/access/",evidence:"read",
      seatCoverage:"内野・アルプス・外野の320参考領域/7区域を部分接続。全物理全数・列番号/特殊席境界・公演アリーナではない",
      imageAvailability:"公式座席全体PDFとLiveWalker20250311補助図の主要輪郭を比較。現行公式設備/外周/駅PDFを部分読図。原図/PDF/ロゴのpublic複製なし",
      stationExits:"甲子園駅西口/東口・駅前広場・球場と甲子園プラスの位置関係を接続。精密/段差なし連続経路は未確定",
      gates:"外周公式図の掲載23門区域を接続。17号門を推測で追加しない。公演当日の使用門は券面と主催者案内で確認",
      facilities:"内野・アルプス/外野の1〜3F、主要男女/多目的トイレ・授乳3/AED7/店名検索/喫煙区域・一覧と詳細を部分接続。精密入口/全記号は後段",
      baggagePayment:"球場内荷物設備なしを一般FAQで確認。甲子園駅/甲子園プラス2F/大阪梅田B1・B2/梅田予約店舗を図外一覧へ接続。歴史館営業中のみ・閉館後回収不可を保持。駅の個別条件/店舗料金・空きは未確定",
      eventDependency:"常設スタンド、公演別アリーナ/使用席、入場先、設備営業・券種間通行、銀傘拡張を区別",
      blocker:"主要4分野の一次接続。全列番号/特殊席精密化・機械/入口/経路・全境界/全条件/実機多点は後段。全確認済み・数値90%ではない",
      diagramRights:"publish-use-unconfirmed",uiQa:"partial"} satisfies VenueGuideInventory;
  }
  if (candidate.id === "zozo-marine") {
    return {venueId:candidate.id,name,status:"partial",checkedAt:"2026-10-10",officialUrl:candidate.home,
      seatUrl:"https://www.marines.co.jp/ticket/seat/genelal/",floorUrl:"https://www.marines.co.jp/stadium/ballpark/guidemap.html",accessUrl:"https://www.marines.co.jp/stadium/access/",evidence:"read",
      seatCoverage:"下段・上段・外野の318参考領域/8区域を部分接続。全物理全数・全列番号・特殊席精密対応・公演アリーナではない",
      imageAvailability:"LiveWalker20250306補助図と現行公式主要輪郭/2026席種資産を比較。公式2026グルメ図12/13ページを部分読図。原図/PDF/ロゴはpublicへ複製なし",
      stationExits:"海浜幕張駅南口から徒歩約15分の掲載区域と周辺施設。精密出口・連続/段差なし経路は未確認",
      gates:"現行デジタルマップのL/R/F/B/D/Cの6ゲート区域。公演当日の使用ゲートは券面と主催者案内で確認",
      facilities:"場内70/場外26の96機能・74固定区域・9図/5場外表示。店名検索、主要男女トイレ/AED/赤ちゃん、階/目的/場所一覧と詳細へ接続",
      baggagePayment:"球場3区域（場内1/外周2）・海浜幕張改札外3・東京4掲載区域/カウンター・予約店舗1の11荷物導線。球場2026年6月19日変更を反映。寸法/個別位置/店舗受付時間と空きは未確定",
      eventDependency:"野球開催日限定のベビーカー/子供設備と公演開放を区別。スタンド使用席・当日入場先・営業時間は開催日別",
      blocker:"主要4分野の一次制作。全列番号/特殊席・精密入口/経路・全境界/全条件/実機多点は後段。全確認済み・数値90%ではない",
      diagramRights:"publish-use-unconfirmed",uiQa:"partial"} satisfies VenueGuideInventory;
  }
  if (candidate.id === "belluna-dome") {
    return { venueId:candidate.id,name,status:"partial",checkedAt:"2026-10-10",officialUrl:candidate.home,
      seatUrl:"https://www.seibulions.jp/cmn/images/ticket/2026/dome/seat_2026.pdf",floorUrl:candidate.floor,accessUrl:"https://bellunadome.seibulions.co.jp/guide/access.html",evidence:"read",
      seatCoverage:"2026公式常設席の301参考領域・5区域を接続。外野180/182/184/380/382/384の73列帯525キー・左右で異なる短い行端・若い側中点を部分接続。全物理全数・全席番号・公演アリーナではない",
      imageAvailability:"2026公式席図とLiveWalker20220119補助図を限定比較。公式スタジアム/敷地PDFとFAQを部分読図。原図/PDF/ロゴはpublicへ複製なし",
      stationExits:"西武球場前駅改札と敷地の区域を接続。2026〜2029年度改修告知を保持。精密出口/段差なし連続経路と改修後の配置は未確認",
      gates:"メイン/サブ/オーナーズの3ゲート区域を接続。券面の当日入場先・専用条件を確認",
      facilities:"場内107/場外25の132機能・88固定区域・12図/4場外表示。ドーム/獅子ビル1〜3F/センタービル1〜3F/ラウンジを分離。男女/授乳/AED/店名検索/一覧/詳細・未掲載グレーを接続",
      baggagePayment:"ドーム内ロッカーなしをFAQで確認。西武球場前/西所沢/所沢の改札内SPACER4と所沢予約預かり1を図外一覧へ接続。乗車券/料金/時間/予約条件を保持。スキー場周辺ロッカー・機械の精密点/寸法/空きは未確定",
      eventDependency:"常設席・別棟/ラウンジの専用券条件、野球限定ベビーカー預かりを分離。公演の座席/入場先/開放/営業は開催日別",
      blocker:"主要4分野を一次接続しPC/スマホ基本操作を確認。追加全列番号/特殊席・精密入口/経路・全境界/全条件/実機多点は後段。全確認済み・数値90%とは扱わない",
      diagramRights:"publish-use-unconfirmed",uiQa:"partial" } satisfies VenueGuideInventory;
  }
  if (candidate.id === "sapporo-dome") {
    return { venueId:candidate.id,name:"大和ハウス プレミストドーム（札幌ドーム）",status:"partial",checkedAt:"2026-10-10",officialUrl:candidate.home,
      seatUrl:"https://www.sapporo-dome.co.jp/guide/",floorUrl:candidate.floor,accessUrl:"https://www.sapporo-dome.co.jp/access/subway/",evidence:"read",
      seatCoverage:"公式の野球・コンサート/サッカーを別モードで接続。各モード43・45通路間の21番側115番号と39列横通路を部分確認。その他の番号・券種/特殊席境界は未確認",
      imageAvailability:"現行公開2024公式座席PDF、公式詳細2画像、LiveWalker20240725補助PDFを部分照合。原図のpublic複製なし",
      stationExits:"地下鉄福住駅3番出口徒歩約10分。敷地図へ駅出口・ゲートの区域を接続。入口中心・段差なし連続経路は未確認",
      gates:"北/南1〜3・西1/3・東のゲート区域を敷地図へ接続。券面の当日入場口は主催者確認",
      facilities:"館内72/場外20機能・43固定区域・10図/4場外表示。各階/目的/未掲載グレー/一覧/詳細/店名検索へ接続。B2F関係者/4F専用条件を保持",
      baggagePayment:"会場館内5/入場前2、福住/さっぽろ6区域/JR札幌/ヤマト3店舗を分けた18案内。会場硬貨/寸法/預り金/当日条件を確認、駅機械別料金・境界/店舗受付と空きは未確定",
      eventDependency:"会場モード、公演アリーナ、開放・入場口・店舗営業は開催日別。期間終了JR臨時預かりを現行常設へ昇格しない",
      blocker:"主要4分野を一次接続。追加番号/特殊席精密化・全境界/全条件/実機多点は後段。基本操作の確認範囲はsource-reviewへ記録し全仕様適合・数値90%とは扱わない",
      diagramRights:"publish-use-unconfirmed",uiQa:"partial" } satisfies VenueGuideInventory;
  }
  if (candidate.id === "paypay-dome") {
    return { venueId: candidate.id, name: "みずほPayPayドーム福岡", status: "partial", checkedAt: "2026-10-10", officialUrl: candidate.home,
      seatUrl: "https://beak.softbankhawks.co.jp/ex/seat/pc/map/", floorUrl: "https://platinumaps.jp/maps/mizuho-paypaydome", accessUrl: "https://www.softbankhawks.co.jp/stadium/access.html", evidence: "read",
      seatCoverage: "普通席215参考領域と8大枠から区画を選択。3塁側26〜39列461番側の179キーを公式詳細126と補助図へ部分照合し、検索・若い側中点・短い矢印へ接続。残る番号・特殊席・全物理境界は未確認",
      imageAvailability: "現行公式の全体/個別図と20240426補助PDFを部分比較。公式フロアの1F/3Fをブラウザ照合。原図の公開複製なし",
      stationExits: "唐人町駅3番出口徒歩約15分と階段を公式で確認。駅代表点とゲート8を北上略図へ接続。正確な出口座標・段差なし連続経路は未転記",
      gates: "公式デジタル掲載点によるゲート8。担当席・当日入場口・入口実測は未確定",
      facilities: "館内1〜6F146/場外29の175機能・147固定区域・11図/5場外表示を部分接続。女性/男性/多目的、階/目的/一覧/詳細/店名検索を接続。4〜6F券種条件を保持",
      baggagePayment: "デッキ・外周6掲載点と4/6/7ゲート条件、唐人町・博多・Crosta・MARK IS1〜4Fの図外一覧へ接続。16件は重複範囲を含む利用案内で機械数ではない。現行機械別料金/サイズ/入口/空きは未確定",
      eventDependency: "常設席の参考範囲。券種・公演アリーナ・開放・営業時間・入場口は当日別",
      blocker: "主要導線を初期接続し基本確認。追加列番号・特殊席の精密対応、室入口/駅・店舗個別点/全条件、全札/全境界最終比較・実機多点は後段。全仕様適合・数値90%以上を意味しない",
      diagramRights: "publish-use-unconfirmed", uiQa: "partial" } satisfies VenueGuideInventory;
  }
  if (candidate.id === "vantelin-dome") {
    return { venueId: candidate.id, name, status: "partial", checkedAt: "2026-10-10", officialUrl: candidate.home,
      seatUrl: candidate.seat, floorUrl: candidate.floor, accessUrl: candidate.access, evidence: "read",
      seatCoverage: "下段・上段・パノラマの確認範囲とL/R番号、2026ウイングA/B/C列を部分検索。プライムは別の展開図でツイン列/LR番号・ボックス番号・レストランF/H番号を部分接続。若い側の辺中点/短い矢印・区域/詳細/全体復帰を接続。全席番号・一部特殊席と球場全体への精密配置は未確認",
      imageAvailability: "2026公式背景図と補助PDFの大きな輪郭/通路を比較。原PDF/画像は調査用のみ。独立した部分参考図で全ブロック照合・実測席点ではない",
      stationExits: "地下鉄ナゴヤドーム前矢田1番出口徒歩5分、JR/名鉄大曽根徒歩15分を公式本文で確認。代表駅区域/文字アクセスと名古屋JR1F/B1F図を部分接続。最寄り精密出口/連続経路は未確定",
      gates: "2F館内と敷地図に8ゲート代表位置を部分接続。担当席/当日の公演入場口/実測入口・連続経路は未確定",
      facilities: "2〜5F126館内機能・84固定区域、場外88機能・56固定区域を部分接続。館内4図と場外10表示、敷地/ゲート8/モール1〜3F/駅・乗換先の図または図外一覧を接続。男女/多目的記号とベビーカー9を分離、店名検索/区域一覧/詳細、4F専用券条件を保持",
      baggagePayment: "館内2F5か所、300/500/600円・寸法・100円硬貨・イベント終了までの取出、38通路前の大型なしを接続。場外荷物21区域としてモール/駅/乗換先/有人預かりを部分接続。矢田/大曽根の現行設置点、モール普通ロッカー寸法/時間/対象、個別予約店は未確定",
      eventDependency: "公式2026野球案内/補助図の常設範囲を参照。アリーナ/販売席/設備開放/当日の入口は公演別",
      blocker: "主要4分野の一次接続を区切り、追加列/番号・未接続取得席キーの物理対応・特殊席の精密化は後段。荷物/入口/経路の個別未確定条件、全受入/実機多点/最終比較/公開利用条件は残る。全仕様適合・数値90%以上を意味しない",
      diagramRights: "publish-use-unconfirmed", uiQa: "partial" } satisfies VenueGuideInventory;
  }
  if (candidate.id === "gaishi-hall" || candidate.id === "marine-messe") {
    const isGaishi = candidate.id === "gaishi-hall";
    return { venueId: candidate.id, name: isGaishi ? "クロコくんホール（旧日本ガイシホール）" : "マリンメッセ福岡A館", status: "partial", checkedAt: "2026-10-05", officialUrl: candidate.home,
      seatUrl: isGaishi ? "https://www.nespa.or.jp/sports-plaza/hall/seating-chart/" : "https://www.marinemesse.or.jp/messe/",
      floorUrl: isGaishi ? candidate.floor : "https://www.marinemesse.or.jp/messe/facilities", accessUrl: isGaishi ? "https://www.nespa.or.jp/sports-plaza/hall/access/" : candidate.home, evidence: "read",
      seatCoverage: isGaishi ? "正式A〜P・Sの17区域。区画名検索のみ。2〜4Fの区画別階・固定/可動・列/番号は未確認" : "コンサート17/センター19区画を分離。H〜Lの各1〜5列、通路分割と15/21番端を目視し部分数値検索。ほかは区画名検索のみ",
      imageAvailability: "現行座席資料のSHA一致。原画像は調査のみ。独立した区域略図で、椅子・精密な通路位置は未達",
      stationExits: isGaishi ? "笠寺・本笠寺・大江、乗換金山/名古屋の北上代表区域。個別出口なし" : "呉服町・中洲川端・天神・博多、ベイサイドの北上代表区域。個別出口なし",
      gates: "正式区画名と入口を混同しない。指定入口・連続経路は未登録",
      facilities: isGaishi ? "主ホールの多目的トイレ4記号。隣接施設10記号を分離保存。館内荷物・売店は場所一覧" : "A館49設備記号を保持。トイレ室の代表区域・同一階引出線終点・未配置一覧を区別。屋外設備を分離。B館を含めない",
      baggagePayment: isGaishi ? "館内1Fロビー中央、場外は金山2/名古屋1のロッカー一覧。料金推定なし" : "館内1F両側ロッカー、場外4駅とベイサイド。終電/閉館後の取り出し制限を案内",
      eventDependency: isGaishi ? "大会による一般利用休止予定と大会観客入場を分離。復旧後の変更は未確認" : "中央アリーナ・可動席・ステージ・番号・開放は公演別。図のパターンを会場開催回と同一視しない",
      blocker: "残りの列別番号・設備全数/精密位置・個別出口/経路・公開利用条件。目視/実操作はユーザー確認待ち。ローカル追加を継続",
      diagramRights: "publish-use-unconfirmed", uiQa: "pending" } satisfies VenueGuideInventory;
  }
  if (candidate.id === "budokan") {
    return { venueId: candidate.id, name, status: "partial", checkedAt: "2026-10-06", officialUrl: candidate.home,
      seatUrl: "https://www.nipponbudokan.or.jp/pdf/shinkoujigyou/rensei/2025/kendo_zaseki_1.pdf",
      accessUrl: "https://www.nipponbudokan.or.jp/about/access", evidence: "read",
      seatCoverage: "1階/2階×8方向を通路で118ブロックへ分離。249印字列の10,897参考席キーを858分割列へ接続。団体割当番号・公演別アリーナ・立見Yは除外",
      imageAvailability: "原画像は調査のみ。輪郭/通路を清書した独立略図。列線・番号目印は実測位置ではない",
      stationExits: "九段下2番徒歩5分・竹橋1番徒歩12分。公園図は北向きの駅代表位置、個別出口と連続経路は未確認",
      gates: "1F北/東/南/西の玄関と2F8方向の代表目印。公演指定入口/担当席へ変換しない",
      facilities: "本館1F/2Fのトイレ・7売店・AED・EVと授乳室の場所一覧。B2AEDは独立一覧。公園11記号を保持し、中道場・敷地飲食を分離",
      baggagePayment: "館内ロッカーなし。九段下B2改札外2区域・改札内乗換付近・6番出口付近メトロッカー＋、竹橋の計5区域。B2改札外はPASMO対応。料金/空きは推定しない",
      eventDependency: "アリーナ・使用席・男女割当・設備開放・指定入口は公演別。2階スタンド各列と建築2/3階の対応は未確認で現在階を保持",
      blocker: "1階Kの5方向/北西Rの1印字、精密室入口・駅出口・連続動線・有人預かりの現行個別予約・公開利用条件。細かな目視と実機多点入力は後段",
      diagramRights: "publish-use-unconfirmed", uiQa: "partial" } satisfies VenueGuideInventory;
  }
  if (candidate.id === "yoyogi") {
    return { venueId: candidate.id, name, status: "partial", checkedAt: "2026-10-06", officialUrl: candidate.home,
      seatUrl: "https://www.jpnsport.go.jp/yoyogi/seat/tabid/62/Default.aspx",
      accessUrl: "https://www.jpnsport.go.jp/yoyogi/access/tabid/88/Default.aspx", evidence: "read",
      seatCoverage: "44正式区画の606印字列/8,636印字セルを72参考ブロックへ分離。欠番・階段の空白を保持した列/番号検索。公演アリーナ・車いす代替席は除外",
      imageAvailability: "原画像は調査のみ。全体位置と各詳細図の列/空白を独立略図へ対応。椅子の実測図ではない",
      stationExits: "原宿/明治神宮前徒歩5分・代々木公園徒歩10分・渋谷徒歩15分。図は駅代表区域",
      gates: "敷地原図の6門と原宿口/渋谷口の代表位置を別図に接続。駅/門は周辺検索で、公演別入場先を自動確定しない",
      facilities: "B1F/1Fの20トイレ・授乳記号と南北売店、敷地レストラン・館外EV2機。AED/自販機/オストメイト室の個別位置は階未確認一覧。49施設/17固定区域/6図",
      baggagePayment: "館内ロッカーなし。原宿3・明治神宮前4・代々木公園1・渋谷11設置区域と原宿の予約店舗1。改札境界/受付終了を表示し精密点・空き・料金は推定しない",
      eventDependency: "アリーナ・使用席・当日の入口と設備開放は公演別。券面階と設備実階を推定接続しない",
      blocker: "特異な原図印字・実測椅子位置、券面/設備階対応、設備全数/個別入口・連続動線・一部改札境界と公開利用条件。細部目視/実機多点入力は後段",
      diagramRights: "publish-use-unconfirmed", uiQa: "partial" } satisfies VenueGuideInventory;
  }
  if (candidate.id === "saitama-super-arena" || candidate.id === "ariake-arena") {
    const isSaitama = candidate.id === "saitama-super-arena";
    return { venueId: candidate.id, name, status: "partial", checkedAt: isSaitama ? "2026-10-05" : "2026-10-06", officialUrl: candidate.home, seatUrl: candidate.seat, floorUrl: candidate.floor, accessUrl: candidate.access, evidence: "read",
      seatCoverage: isSaitama ? "200/300/400/500レベルをアリーナ・スタジアムで分離。正式扉番号付近の案内。担当席範囲・数値検索は未対応" : "常設A〜Hを通路で112物理ブロックへ分離。821列レコード・899印字区間の参考番号検索。アリーナ・可動席・車いす代替配置は除外",
      imageAvailability: "原画像は調査のみ。独立した部分略図・元の設備記号位置をローカル接続",
      stationExits: isSaitama ? "主要駅の北上略図。個別出口・連続経路は未登録" : "4主要駅・ガーデンの原向き周辺図と2駅の独立構内図。北を推定せず、個別出口・連続経路は未登録",
      gates: isSaitama ? "2F A/B/Cゲート名称と正式な座席扉付近を分離。設備階との推定接続をしない" : "公式2F図のゲート1/2/3/4/7/8/9/10を代表位置へ接続。担当席や公演指定入口へ読み替えない",
      facilities: isSaitama ? "各モード2Fの確認済み記号を固定区域で整理。1F荷物等は場所一覧。改修後は未確認" : "元161記号を保護。場内96/場外31設備・58固定区域・8図・場外5表示。付帯記号を別室へ重複計上せず、サブアリーナ側・駅改札境界を分離",
      baggagePayment: isSaitama ? "館内1F・けやきひろば1F・さいたま新都心駅。館内は改修中の利用確認が必要" : "館内2F北91/南54個を原図へ対応。場外は4駅6か所・ガーデン4か所。料金/時間/改札条件を分離。有人預かりの現行個別予約条件は確認できず非掲載",
      eventDependency: isSaitama ? "メイン会場は2027年3月末まで改修休館予定。モード・再開後配置・ステージは公演別" : "1Fアリーナ・可動席・ステージ・設備開放は公演別。来場/帰路は公式指定ルート",
      blocker: isSaitama ? "未確認の列・番号・個別出口・精密位置・公開利用条件。目視/操作はユーザー確認待ち。ローカル追加は継続" : "主要制作済み・後段調整待ち。参考図と現行公演の差、F/Hの設備階、図外個別位置・有人預かり条件・公開条件・細部目視/実機多点操作を残す",
      diagramRights: "publish-use-unconfirmed", uiQa: isSaitama ? "pending" : "partial" } satisfies VenueGuideInventory;
  }
  return {
    venueId: candidate.id, name, checkedAt: isPia ? "2026-10-07" : isGarden ? "2026-10-07" : isK ? "2026-10-04" : "2026-09-30", officialUrl: candidate.home,
    seatUrl: candidate.seat, floorUrl: candidate.floor, accessUrl: candidate.access,
    evidence: candidate.unavailable ? "unavailable" : isTokyo ? "local-existing" : "read",
    status: isTokyo ? "existing" : (isKyocera || isOsaka || isK || isYokohama || isPia || isGarden) ? "partial" : candidate.unavailable ? "blocked" : "research",
    seatCoverage: isGarden ? "3〜5Fの27正式区画・48物理ブロック・297印字列・4649区画/列/番号キー。各列の両端と短い列/車いす置換・横断通路を保持し、正式区画・数値検索へ接続。公演別アリーナは固定しない" : isPia ? "公式20詳細図の2〜4Fを62物理ブロック・394列・5585席キーへ接続。各列の端/欠けを保持し、列・番号/階別出入口コードで検索。公演別アリーナ・販売席は固定しない" : isYokohama ? "A/B/中央の配置別全区画・全列/席番号/欠番、A12の対応は未確認。架空の座席図なし" : isK ? "公式PDFの常設LEVEL3/5/7を62範囲・1031列レコード・15929席へ接続。列別の分割区間/欠番を保持。公演別アリーナと車いす領域は数値検索対象外" : isKyocera ? "16検索グループ・グループ別列レコード284件。全34,364席照合。内部ブロック位置を別保持、列線は未確認" : isOsaka ? "A〜N全14区画の1〜22列、BOX1〜3列を個別目視。BOX3列9区間だけ列線照合、A〜N列線・全席番号/欠番は未確認" : isTokyo ? "既存の会場固有データ・専用UIを維持" : candidate.note ?? "区画・列の全数確認待ち",
    imageAvailability: isGarden ? "階別の座席48物理ブロック/通路と、館内4階/場外10表示を独立図へ接続。58設備記号位置/代表区域を照合。列線/輪郭は目安で実測椅子点ではなく、原画像は掲載しない" : isPia ? "階別の座席輪郭と通路、1〜4F設備、独立した1/2F館外入口図を接続。列線/輪郭は目安で個々の椅子の実測位置ではない。原画像は掲載しない" : isYokohama ? "1/2/3Fと場外原図の記号位置と部分的な可視背景を接続。公開利用条件は未確認" : candidate.unavailable ? "この読取りでは確認不可" : isTokyo ? "既存独自図あり" : candidate.seat || candidate.floor ? "公式資料入口あり。転記・利用条件と全ラベルの照合は別工程" : "公式入口から詳細図を確認する工程が残る",
    stationExits: isGarden ? "有明2B/テニスの森2A/国際展示場Aと公式徒歩案内。各駅の設備は独立した場所一覧へ。代表駅札を押すと同駅施設IDへ絞り、個別出口座標/歩行経路を推定しない" : isPia ? "みなとみらい1番・新高島2番・桜木町東口/北改札の公式案内を表示。場外図は駅代表区域で、個別出口・歩行経路ではない" : isK ? "横浜東口/新高島4臨港パーク口/みなとみらい2いちょう通り口を案内。場外略図は駅代表区域で、出口の精密座標や連続経路ではない" : isOsaka ? "OBP4番出口・JR大阪城公園駅の公式道順を確認。公開場外図の2駅代表位置を接続、改札/4番出口座標は未確認" : isKyocera ? "場外の確認済み3出口を接続。公演当日の規制・段差なし経路は未確認" : "今回の全数転記は未実施",
    gates: isGarden ? "公式の2Fアリーナ/3Fバルコニーゲート代表区域、公演別2F/3F入場、敷地棟を別図へ。館内8EV記号と11Esc位置を接続。昇降路/実入口/公演指定入口や連続段差なし経路は未確認" : isPia ? "1F A/P・2F P/Iの館外入口図と15階段目印、主要3駅/指定出口を接続。各階の原座標を分け、公演指定入口/歩行経路と同一視しない" : isYokohama ? "入口名称位置だけ。印字コード・テナント入口を実ゲートへ変換せず、駅出口座標も未確認" : isK ? `${kFloorNames}の確認済み座席アクセスGATEとLEVEL3入口3点を目印に接続。GATE担当席範囲/場外入場先へ変換しない` : isOsaka ? "公開パンフレット8ページの北玄関・南玄関・東口の3円中心を接続。公演別指定入口/開放は未確認" : isKyocera ? "3F/場外の入場ゲート14。個別ゲートへの公演別経路は未確認" : "今回の全数転記は未実施",
    facilities: isGarden ? "既存35ID/位置を保持。全124施設・機能（館内64/場外60）・48固定区域・14図。50赤記号/8EV位置、6トイレ区域/同室おむつ機能、モール/3駅の設備を接続。2F救護室は文字一覧、館内AED点は未確認グレー" : isPia ? "元19設備/3・4F図を保持。全71施設・32固定区域。館内各階、2F館外トイレ/受付/カフェ、周辺商業施設10件を接続。AED/精密な室入口は未確定" : isYokohama ? "館内設備47記号/目印6、場外券売所2記号/目印3。充電4は案内。保留79候補、室入口・当日運用は未確認" : isK ? `${kFloorNames}の設備${kEvidence.facilities.length}記号/目印${kMarkCount}を保持し固定区域で整理。場外20件を追加。駅ロッカー11区域は場所一覧。図未掲載設備/室入口は未確認` : isOsaka ? "1F図23記号中21を接続、売店2記号の本文不一致を保留。2F既存7点・場外3入口/噴水4点。南救護室横多目的トイレは文字だけ。柱85/階段29は保持、箇所数と図記号数の対応は未確認" : isKyocera ? "3F/5Fの公式アイコン61点・売店26点をHTML/CSS座標へ対応。場外20地点。既存の照合済み目印を保持。2Fとmamaro等の位置は未完" : "今回の個別位置・場内外・階の全数転記は未実施",
    baggagePayment: isK ? "館内ロッカー11区域・場外荷物13件。小型館内/大型屋外/店舗預かり/駅を区別。会場ロッカー現金・館内売店キャッシュレスを公式FAQで確認" : isGarden ? "館内コイン2/4/5Fとポート3/4/5Fの6区域。場外16区域は3F入場前室/ホテル1F/モール3区域/最寄り3駅/乗換3駅7区域/新橋店舗1店。料金/寸法/時間・改札境界を分離。シアターコインIC/カード・ポートICのみ。新橋/豊洲/大崎は別一覧、有人は個別予約URL。料金時間/利用境界の未確定は個別に残す" : isPia ? "館内1F2室は全館料金400/700/800円と寸法・小銭/両替条件。場外は4駅12区域と予約2施設を実階/改札内外/決済/予約で分離。個別機械点・利用日料金/空きは固定しない" : isOsaka ? "ロッカー100円硬貨のみ・両替なしを確認。店舗決済は未確認" : "荷物・全店舗の決済条件の照合は未実施",
    eventDependency: "アリーナ配置・ステージ・設備開放・当日の入口規制は主催者案内を優先",
    blocker: isGarden ? "主要制作済み・13節の90％以上相当へ到達。周辺7店/交通7/乗換3駅/有人1を追加し、124機能/168条件/両幅44詳細・4幅の基本導線を照合。館内AED点/実入口/運転条件・連続経路、実機多点/全条件最終比較・公開条件/本番統合は保留" : isPia ? "主要制作済み・後段調整待ち。ロッカー各室のサイズ方位、AED/受取機/精密入口、周辺候補の全件照合、連続段差なし動線・公演利用、最終目視/実機多点タッチ・公開条件・本番統合は残る" : isYokohama ? "全座席・全列、保留79候補、駅出口/経路、公開利用条件、実機QA・元checkout統合は未完" : isK ? "公演別アリーナ/車いす席領域、精密な駅出口/歩行経路、公開利用条件、多点タッチ実機QA・本番統合は未完。PC/スマホ幅と対象テストは確認" : isOsaka ? "A〜N全列線/全席番号/欠番、1F本文と図の不一致、南救護室横座標、場外の改札/出口/段差なし動線、公開利用条件・元checkout統合・実機QAが残る。詳細/周辺/敷地配置/南諸室図は認証が必要" : isKyocera ? "列線・未対応座席、全設備/目印の網羅、公開利用条件、元checkout統合・実機QAが残る。3Fスマホ操作QA済み、密な表示の可読性は継続レビュー" : candidate.note ?? "専用ガイドの資料照合・実装・QAが残る",
    diagramRights: isTokyo ? "existing-independent" : (isKyocera || isOsaka || isK || isYokohama || isPia || isGarden) ? "publish-use-unconfirmed" : "not-reviewed",
    uiQa: (isPia || isGarden) ? "partial" : "pending",
  };
});
