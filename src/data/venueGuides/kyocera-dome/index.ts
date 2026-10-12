import seats from "./seats.json";
import floorEvidence from "./floor-evidence.json";
import seatEvidence from "./seat-evidence.json";
import secondFloor from "./second-floor.json";
import fourthFloor from "./fourth-floor.json";
import type { DedicatedVenueGuide, GuideFacility, GuideDiagram, SeatGeometry } from "../types";

const checkedAt = "2026-09-30";
const source = (id: string, title: string, path: string, scope: string) => ({ id, title, url: `https://www.kyoceradome-osaka.jp${path}`, checkedAt, scope });
const facility = (id: string, name: string, purpose: GuideFacility["purpose"], floor: string, scope: GuideFacility["scope"], location: string, detail: string, sourceIds: string[]): GuideFacility => ({ id, name, purpose, floor, scope, location, detail, sourceIds, precision: "text-only" });
// Public gourmet map/list/template IDs confirm brands on 2026-10-01.
// Floor image-map titles still disagree. Keep all raw geometry immutable;
// neither a brand-number correspondence nor a label proves an entrance point.
const storeCorrections: Record<string, { name: string; location: string; detail: string }> = {
  "f3-shop-s22": { name: "ムラノ商店×韓激（公式一覧22番）", location: "3F下段・ライト側外野・1通路横。公式詳細：13ゲート・1／36通路前",
    detail: "22番売店。地図は売店区域の目印です。営業時間・当日の利用可否は公式店舗案内を確認してください。" },
  "f3-shop-s30": { name: "球欒食堂（たまらんしょくどう・公式一覧30番）", location: "3F下段・一塁側内野・4通路横。公式詳細：14ゲート・3／4通路前",
    detail: "30番売店。地図は売店区域の目印です。営業時間・当日の利用可否は公式店舗案内を確認してください。" },
  "f5-shop-s35": { name: "なにわの麺処 まんまる（35番）", location: "5F上段・三塁側内野・58通路前",
    detail: "35番売店。案内図の表記は「まるまる」です。営業時間・当日の利用可否は公式店舗案内を確認してください。" },
  "f5-shop-s37": { name: "グレイジーポテト（37番）", location: "5F上段・一塁側内野・54通路前",
    detail: "37番売店。地図は売店区域の目印です。営業時間・当日の利用可否は公式店舗案内を確認してください。" },
  "f5-shop-s39": { name: "いてまえドッグ（5F・39番）", location: "5F上段・三塁側内野・56通路前",
    detail: "39番売店。案内図の表記は「ITEMAE DOGS／池カラ」です。営業時間・当日の利用可否は公式店舗案内を確認してください。" },
  "f3-shop-s18": { name: "ケンタッキーフライドチキン（外野・18番）", location: "3F下段・レフト側外野・29通路前",
    detail: "18番売店。地図は売店区域の目印です。営業時間・当日の利用可否は公式店舗案内を確認してください。" },
  "f3-shop-s19": { name: "モスバーガー（外野・19番）", location: "3F下段・ライト側外野・31通路前",
    detail: "19番売店。地図は売店区域の目印です。営業時間・当日の利用可否は公式店舗案内を確認してください。" },
  "f3-shop-s25": { name: "モスバーガー（内野・25番）", location: "3F下段・三塁側内野・17通路前",
    detail: "25番売店。地図は売店区域の目印です。営業時間・当日の利用可否は公式店舗案内を確認してください。" },
  "f3-shop-s29": { name: "ケンタッキーフライドチキン（内野・29番）", location: "3F下段・一塁側内野・7通路横",
    detail: "29番売店。地図は売店区域の目印です。営業時間・当日の利用可否は公式店舗案内を確認してください。" },
};
const mapped = (floorEvidence.facilities as GuideFacility[]).map(item => {
  const fourth = fourthFloor.facilities.find(current => current.id === item.id);
  if (fourth) return fourth as GuideFacility;
  // The current 2026 map names this nursing symbol b's room at passage 13.
  // Support lists a separate baseball-only mamaro here; its exact point is not shown.
  if (item.id === "f3-milk-01") return { ...item,
    name: "b’sルーム（赤ちゃん休憩所）", location: "3F下段・13通路付近（プロ野球開催時）",
    detail: "プロ野球開催時に利用できます。授乳ブースは女性専用で、おむつ替え用ベッド・おむつ用ごみ箱があります。その他の公演での開放・利用時間は主催者の案内を確認してください。",
    sourceIds: [...item.sourceIds, "guide-2026", "support"] };
  const correction = storeCorrections[item.id];
  if (!correction) return item;
  return { ...item, name: correction.name, location: correction.location, detail: correction.detail,
    sourceIds: [item.floor === "5F" ? "store-floor-5" : "store-floor-3", "store-gourmet", ...(item.id === "f3-shop-s22" ? ["store-murano-detail"] : item.id === "f3-shop-s30" ? ["store-tamaran-detail"] : [])] };
});
const diagrams = [secondFloor.diagram as GuideDiagram, fourthFloor.diagram as GuideDiagram, ...(floorEvidence.diagrams as GuideDiagram[]).map(diagram => ({ ...diagram,
  landmarks: diagram.landmarks.filter(mark => mark.id !== "landmark-f3-shop-sBsBar").map(mark => {
    if (mark.id === "landmark-f3-shop-s22" || mark.id === "landmark-f3-shop-s30") {
      const number = mark.id.endsWith("s22") ? "22" : "30";
      return { ...mark, name: `${number}番売店（${number === "22" ? "ムラノ商店×韓激" : "球欒食堂"}・番号領域）` };
    }
    const correction = storeCorrections[mark.id.replace(/^landmark-/, "")];
    return correction ? { ...mark, name: correction.name } : mark;
  }),
}))];
const mappedAed = (id: string, sourceId: string) => {
  const item = mapped.find(f => f.id === sourceId)!;
  return { ...item, id, sourceIds: [...item.sourceIds, "support"] };
};

import luggage from "./luggage.json";

export const kyoceraDomeGuide: DedicatedVenueGuide = {
  venueId: "kyocera-dome",
  name: "京セラドーム大阪",
  seatNote: "地図のタップ、上段・下段や1塁側・3塁側のボタン、チケットの区画・列・番号の入力から座席を探せます。公演の券面・主催者案内を優先してください。",
  diagramNote: "同じ会場図のまま拡大し、周辺のブロックと通路を残します。列線は等間隔の目安、番号の矢印は増える方向です。端の番号は列で異なります。設備へ進む階は公式フロア案内の階です。",
  seatTypes: ["下段", "上段", "アリーナ／ビスタ等"],
  seats,
  sources: [
    ...luggage.sources as import("../types").GuideSource[],
    source("seat", "公式座席案内", "/seat/", "上段・下段検索、コンサート変更・可動式アリーナ非対応の注意"),
    source("seat-lookup", "公式座席検索の公開データ", "/app/_src/data.json", "座席案内HTMLが参照する公開静的JSON。列・席番号・通路を抽出。通常300とFA/FB36物理ブロックを区別し、確認済み158検索キーを保持"),
    source("seat-overview", "公式座席全体図", "/seat/pdf/kyoceradome_seat.pdf", "中央A〜L・1塁側・3塁側の関係を目視。野球開催時の図"),
    source("floor-3", "公式3Fフロアガイド", "/floor_guide/f3/", "下段席・1〜36通路・1〜14入場ゲート。公演ごとの運用は別"),
    source("floor-5", "公式5Fフロアガイド", "/floor_guide/f5/", "上段席・51〜66通路・設備の凡例"),
    source("floor-css", "公式フロア図の公開位置指定", "/css/floor_guide.css", "3F/5Fの718pxキャンバス。HTML記号のleft/top・寸法と照合。画像中心配置を別記録"),
    source("seat-location", "公式座席検索の公開ブロック位置", "/app/_src/location.json", "公式公開JSが参照する内部ブロック位置。券面コードや個別席・列線ではない"),
    source("seat-block-detail", "公式座席検索の区画詳細図", "/app/_src/img/stadium/img_stadium_mapdetail_A_BM_01.png", "公開検索JSが各blockCodeから参照する300枚の1600×1600詳細図。赤い選択領域の外縁を1px以内で簡略化。列線や公演別開放範囲ではない。原画像はアプリに含めない"),
    { ...source("support", "公式施設サポート", "/floor_guide/support/", "北口案内・赤ちゃん設備・AED・各階トイレ・東口エレベーター。2F b’sルーム、3F30通路前mamaro、野球開催時の13通路b’sルーム/mamaroを2026-10-07再照合。mamaroの精密位置は図に未掲載"), checkedAt: "2026-10-07" },
    { ...source("floor-2", "公式2Fスタジアムモール案内", "/floor_guide/f2/", "現在の39設備記号/7施設区域、店舗本文、3Fゲートとの利用境界。個別入口と当日開放は別確認"), checkedAt: secondFloor.checkedAt },
    { ...source("floor-2-css", "公式2F設備の配置指定", "/css/floor_guide.css", "718pxキャンバス、HTML内の追加指定と実描画の記号中心を照合。女性大規模トイレの文字行を含む"), checkedAt: secondFloor.checkedAt },
    { ...source("floor-2-image", "公式2Fフロア図", "/floor_guide/f2/img/img-map-2f-pc.png", "574×740原向き図の中央配置+72px。大きな階輪郭/店舗区域の代表位置。原画像はアプリに含めない"), checkedAt: secondFloor.checkedAt },
    { ...source("guide-2026", "公式ガイドマップ2026", "/download/img/guidemap2026.pdf", "2F図の4ロッカー・階/ゲート境界・凡例を本文と図で照合。料金/営業時間/一般利用は施設別に確認"), checkedAt: secondFloor.checkedAt },
    source("access", "公式アクセス", "/access/", "周辺図・入場口案内。出口番号の転記は未確認"),
    source("access-area", "公式入場口・周辺エリア図", "/access/img/img-access-around-dome-2026.jpg", "14ゲート・3出入口・3駅出口・入場前設備の記号を目視採点。斜視図であり実測座標/距離/最短経路ではない。原画像はアプリに含めず、輪郭転記の公開許諾は未確認"),
    { ...source("store-floor-3", "公式3F店舗本文", "/floor_guide/f3/", "2026-10-01再照合。22/30の店舗本文と図titleの不一致を保持。Bs BEER BARの本文所在は4F"), checkedAt: "2026-10-01" },
    { ...source("store-floor-5", "公式5F店舗本文", "/floor_guide/f5/", "2026-10-01再照合。35番の名称表記差、37/39の番号・図表記を区別"), checkedAt: "2026-10-01" },
    { ...source("store-gourmet", "公式グルメ一覧", "/gourmet/", "2026-10-01再照合。店舗番号と名称・文章の所在のみ。当日営業や図上入口点の証明ではない"), checkedAt: "2026-10-01" },
    { ...source("store-murano-detail", "ムラノ公式店舗詳細", "/gourmet/shop-list/shop-8.html", "2026-10-01：図22→一覧index8→modal8→shop8の接続。13ゲート・1/36通路前は所在目印で、指定入場ゲートや入口座標ではない"), checkedAt: "2026-10-01" },
    { ...source("store-tamaran-detail", "球欒公式店舗詳細", "/gourmet/shop-list/shop-17.html", "2026-10-01：図30→一覧index12→modal17→shop17の接続。14ゲート・3/4通路前は所在目印で、指定入場ゲートや入口座標ではない"), checkedAt: "2026-10-01" },
    { ...source("store-bs-access", "Bs BEER BAR公式アクセスPDF", "/floor_guide/img/pdf/img-map-bsbeerbar.pdf", "3F6通路前20/21号EV→4F右折→直進の写真・小図を照合。独立4F図の店舗C/EV到着点Bの原記号中心へ接続。個別入口・当日運転/営業は別確認。PDF画像・写真はアプリに含めない"), checkedAt: fourthFloor.checkedAt },
  ],
  facilities: [
    ...secondFloor.facilities as GuideFacility[],
    ...fourthFloor.facilities.filter(item => !floorEvidence.facilities.some(current => current.id === item.id)) as GuideFacility[],
    ...(luggage.facilities as GuideFacility[]).filter(item => !secondFloor.facilities.some(current => current.id === item.id)),
    { ...facility("mamaro-30", "mamaro（ベビーケアルーム）", "赤ちゃん", "3F", "場内", "3Fコンコース・30通路前", "施錠できる個室で、授乳・おむつ替え・着替えに性別を問わず使えます。開場〜閉場が目安で、イベントにより変更されます。", ["support"]), kind: "baby" },
    { ...facility("mamaro-13", "mamaro（ベビーケアルーム）", "赤ちゃん", "3F", "場内", "3Fコンコース・13通路（プロ野球開催時）", "プロ野球開催時に利用できます。施錠できる個室で、授乳・おむつ替え・着替えに性別を問わず使えます。その他の公演での開放・利用時間は主催者の案内を確認してください。", ["support"]), kind: "baby" },
    { ...mappedAed("aed-12", "f3-aed-02"), location: "12通路前" },
    { ...mappedAed("aed-30", "f3-aed-01"), location: "30・31通路の間" },
    { ...mappedAed("aed-55", "f5-aed-01"), location: "55通路前" },
    ...mapped.filter(item => !["f3-aed-01", "f3-aed-02", "f5-aed-01"].includes(item.id)),
    ...floorEvidence.outsideFacilities as GuideFacility[],
  ],
  routes: [
    { id: "subway-hanshin", from: "ドーム前千代崎駅／ドーム前駅", exit: "出口番号は未確認", stops: ["東口のエレベーター（公式図A）", "3Fへ"], destination: "3F入場ゲート", note: "公式サポートのエレベーター案内です。駅出口からの連続した段差なし経路・当日の開放は未確認。指定ゲートは券面を確認してください。", sourceIds: ["support", "access"] },
    { id: "taisho", from: "大正駅", exit: "出口番号は未確認", stops: ["東口のエレベーター（公式図B）", "3Fへ"], destination: "3F入場ゲート", note: "駅からエレベーターまでの曲がり角・距離は未転記です。案内図AとBの場所を同一位置とみなしません。", sourceIds: ["support", "access"] },
  ],
  unverified: ["公演別アリーナ席、FA/FBと設備階の対応、ビスタルームの個別座席", "全体図上の精密な列位置と個々の椅子の位置。等間隔の列線や番号の目印を、実測位置や全列共通の端番号とみなさない", "駅出口からゲートまでの連続した安全/段差なし動線・公演別入口規制", "2F設備は公式記号の代表位置。実室入口/壁・ロッカー料金/サイズ/決済/全条件、13・30通路のmamaroの精密位置は未確定。別の授乳室記号へ付け替えない", "公式座席検索に未掲載の席・現在の公演で変更された席", "店舗22/30の3F図titleは公式グルメID接続と不一致。番号と名称の対応は確認済みだが、現物入口・営業・改称/移転日は未確認。4F Bs BEER BARと20/21号EVは独立小図の代表点へ接続し、現物入口・当日運転/営業は未確認", "場外荷物23か所は21か所の位置/利用条件を部分確認。駅11区域の料金・寸法・利用時間等、全施設の精密入口/空き・決済、フジロッカー2か所の現行設置/条件は未確定", "追加目印・場外20地点の最終視覚照合、掲載データ・輪郭転記図の公開利用条件。原画像の無許諾再利用は保留"],
  diagrams,
  seatMap: {
    viewBox: seatEvidence.viewBox, initialView: [530, 1080, 550, 440],
    groups: Object.fromEntries(seatEvidence.groups.map(group => [group.id, group])) as Record<string, SeatGeometry>,
    rowGeometryStatus: "unverified", shapeStatus: seatEvidence.shapeStatus,
  },
  rights: { url: "https://www.kyoceradome-osaka.jp/rules/", checkedAt, status: "publish-use-unconfirmed", note: "公式利用条件の引用・転載・加工制限を確認。原画像・ロゴはアプリに含めない。輪郭を転記した素材の公開使用は保留し、個別事実の独自表示・抽出データ集合・リンクは別に確認する。現在は非公開のローカル検証。" },
};
