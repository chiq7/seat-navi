import seatEvidence from "./seat-evidence.json";
import floorEvidence from "./floor-evidence.json";
import type { DedicatedVenueGuide, GuideFacility, GuideDiagram, SeatGeometry } from "../types";
import stands from "./stand-seats.json";
import { osakaOutsideFacilities, osakaOutsideSources } from "./outside";

const checkedAt = "2026-09-30";
const source = (id: string, title: string, path: string, scope: string) => ({ id, title, url: `https://www.osaka-johall.com${path}`, checkedAt, scope });
const facility = (id: string, name: string, purpose: GuideFacility["purpose"], floor: string, location: string, detail: string, sourceIds: string[]): GuideFacility => ({ id, name, purpose, floor, location, detail, sourceIds, scope: "場内", precision: "text-only", toiletType: id.startsWith("accessible-") ? "accessible" : undefined });
const floor2Points: Record<string, [number, number]> = {
  "accessible-2": [1889, 877], "toilet-w-2": [1439, 1303],
  "locker-2-02": [871, 1279], "locker-2-06": [1311, 1301], "locker-2-09": [1617, 1163],
  "locker-2-11": [1765, 1023], "locker-2-14": [1846, 767],
};
const anchored = (item: GuideFacility): GuideFacility => {
  const point = floor2Points[item.id];
  return point ? { ...item, precision: "diagram-point", sourceIds: [...item.sourceIds, "floor"],
    toiletType: item.id === "accessible-2" ? "accessible" : item.id === "toilet-w-2" ? "women" : undefined,
    anchor: { diagramId: "osaka-f2", x: point[0], y: point[1], sourceIds: ["floor"], reference: "公式2F図2000×1420の記号中心を目視採点。原図許容誤差16px。座席全体図と向きが異なるため座標を流用しない。" } } : item;
};

// 全体図とA〜N各詳細図を個別に目視。実座席の座標を模写せず、区画関係の模式図にする。
const positions: [string, number, number][] = [
  ["A", 430, 370], ["B", 530, 320], ["C", 590, 250], ["D", 610, 175],
  ["E", 590, 100], ["F", 530, 40], ["G", 430, 20], ["H", 290, 20],
  ["I", 190, 40], ["J", 130, 100], ["K", 110, 175], ["L", 130, 250],
  ["M", 190, 320], ["N", 290, 370],
];

export const osakaJoHallGuide: DedicatedVenueGuide = {
  venueId: "osaka-jo-hall",
  name: "大阪城ホール",
  seatNote: "スタンドA〜Nの1〜22列とBOX席の1〜3列を案内します。アリーナ席・ステージ位置は公演ごとに変わるため、この図では確定しません。",
  diagramNote: "区画の並びを示す独自の模式図です。座席の角度・距離・眺めや入場経路を保証する図ではありません。",
  seatTypes: ["スタンド", "BOX", "アリーナ"],
  seats: stands.blocks.map(b => ({ id: b.id, label: b.id === "BOX" ? "BOX席" : `${b.id}ブロック`, type: b.level, floor: "2F", x: b.center[0], y: b.center[1], rows: b.rows.map(r => ({ label: r.label, ranges: r.segments.map(s => ({ start: s.start, end: s.end, passage: b.id })) })), sourceIds: b.sourceIds })),
  sources: [
    { id: "seat-search-current", title: "公式スタンド座席検索", url: "https://www.osaka-johall.com/seat/search.html", checkedAt: "2026-10-05", scope: "A〜N・BOXの8,933個の席キー。列別の実在番号と欠番を接続。", usage: "facts-only" },
    ...osakaOutsideSources,
    source("seat", "公式座席表", "/seat/", "A〜N・BOXの位置関係、2Fスタンド、公演別アリーナの制約"),
    ...positions.map(([letter]) => source(`rows-${letter}`, `${letter}ブロック公式詳細図`, `/seat/img/seat_${letter.toLowerCase()}_detail.gif`, "1〜22列と番号の増える向きを個別目視。実在番号はseat-search-currentで全数照合")),
    source("rows-BOX", "BOX席公式詳細図", "/seat/img/seat_box_detail.gif", "1〜3列、A・Nブロック側からの案内"),
    source("floor", "公式フロアガイド", "/floorguide/", "1Fアリーナ・2Fスタンドの設備"),
    source("floor-1-image", "公式1Fフロア図", "/floorguide/img/img_floor_1f.png", "原図1892×1382の設備23記号を個別採点。23記号を接続。西側売店2記号は本文との不一致・営業対応確認中を明示。記号数と箇所数・室数は別"),
    source("floor-2-image", "公式2Fフロア図", "/floorguide/img/img_floor_2f.png?v2", "原図2000×1420の柱14売店を本文と照合して接続。既存7設備点を保持"),
    source("shop", "公式売店案内", "/floorguide/shop/", "東側1F柱08・14、2F柱14。1F図の西側2売店記号との営業対応は未確認。営業はイベント依存"),
    source("toilet", "公式トイレ案内", "/floorguide/toilet/", "柱番号・南救護室横の場所。男女の運用は公演依存"),
    source("locker", "公式ロッカー案内", "/floorguide/coinlocker/", "階・柱番号・100円硬貨対応"),
    source("access", "公式交通アクセス", "/access/", "来場駅・会場駐車場なし"),
    source("outside-pamphlet", "公式公開パンフレット・8ページ場外図", "/organizer/download/data/pamphlet.pdf", "入口3点・噴水のPDF円中心と2駅の代表位置。原図の可視輪郭を同じ座標系で単色化。改札・OBP4番出口・階段の位置と経路線は未確認"),
    source("route-jr", "大阪城公園駅からの公式道順", "/access/osakajo-koen/", "JO-TERRACE・噴水広場・北玄関。階段あり"),
    source("route-obp", "大阪ビジネスパーク駅からの公式道順", "/access/obp/", "4番出口・松下IMP・城見1・大阪城新橋・北玄関。階段あり"),
  ],
  facilities: [
    facility("accessible-1", "多目的トイレ", "トイレ", "1F", "南救護室横", "オストメイト対応。開放状況は当日の案内を確認してください。", ["toilet"]),
    facility("accessible-2", "多目的トイレ", "トイレ", "2F", "柱13付近", "オストメイト対応。席のブロックとの対応は未確認です。", ["toilet"]),
    facility("toilet-w-2", "女性トイレ", "トイレ", "2F", "柱07付近", "公演運営によって一部の設備が利用できない場合があります。", ["toilet"]),
    ...["02", "06", "09", "11", "14"].map(column => facility(`locker-2-${column}`, "コインロッカー", "荷物", "2F", `柱${column}付近`, "100円硬貨を事前に用意してください。空き・大型荷物の収容は当日確認。", ["locker"])),
    facility("changing-1", "おむつ替え設備（個別対応未確認）", "赤ちゃん", "1F", "公式案内の全箇所と図記号の対応は確認中", "公式案内は1F9箇所、図は7記号です。図の7記号は個別に案内していますが、箇所数と記号数の対応を推測で補いません。", ["floor", "toilet"]),
    ...floorEvidence.facilities as GuideFacility[],
    ...osakaOutsideFacilities,
  ].map(anchored),
  routes: [
    { id: "jr", from: "大阪城公園駅", exit: "改札を出て左へ", stops: ["階段を下りる", "JO-TERRACE OSAKA沿い", "噴水広場", "階段を上る"], destination: "北玄関", note: "公式の道順を整理しています。段差なしの経路ではありません。入場口の指定は公演案内を優先してください。", sourceIds: ["route-jr"] },
    { id: "obp", from: "大阪ビジネスパーク駅", exit: "4番出口", stops: ["松下IMPビル沿い", "城見1交差点を右へ", "大阪城新橋", "噴水広場・階段"], destination: "北玄関", note: "階段のある公式ルートです。地図上の距離・所要時間・最短経路は示していません。", sourceIds: ["route-obp"] },
  ],
  unverified: ["公演別アリーナ席・ステージ・開放ブロック", "公式検索8,933席キーを列別実在区間に接続。公演による席の使用変更は未確認。全体図上の列線は各詳細図の位置合わせによる目安で、個々の椅子位置は描かない", "1F図23記号を接続。西側売店2記号は図位置のみ・本文との営業対応確認中として案内。南救護室横多目的トイレの座標と本文のトイレ/おむつ台箇所数との個別対応は未確認。柱85点・階段29点を保持。2F既存設備7点の目視採点を保持し、本文と図の柱14売店1点を追加", "場外は公開公式パンフレット8ページに接続。北玄関/南玄関/東口/噴水と駅の代表位置だけ。改札・OBP4番出口・橋/階段/JO-TERRACEの個別座標、AED・授乳室・段差なし経路は未確認。周辺/敷地配置/1F詳細/南諸室図は認証が必要で未取得", "当日の入口規制・売店営業・支払い方法、転記図と事実データの公開利用条件"],
  diagrams: floorEvidence.diagrams as GuideDiagram[],
  seatMap: { viewBox: seatEvidence.viewBox, initialView: [340, 640, 640, 320],
    groups: seatEvidence.groups as Record<string, SeatGeometry>, rowGeometryStatus: "partial", shapeStatus: "source-derived-local-review-pending" },
  rights: { url: "https://www.osaka-johall.com/use/", checkedAt, status: "publish-use-unconfirmed", note: "公式利用条件の転載・使用制限を確認。原画像・ロゴは調査用のみ。輪郭転記素材の公開使用は保留し、区画/設備の事実の独自表示・抽出データ集合・リンクは別に確認する。現在は非公開のローカル検証。" },
};
