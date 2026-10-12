import type { GuideDiagram, GuideFacility, GuideSource } from "../types";
import { yokohamaStationFacilities } from "./station";
import { yokohamaTransferSources, yokohamaTransferStorage } from "./transfer-storage";
import { yokohamaOperatorFacilities, yokohamaOperatorSources } from "./operator-facilities";
export const yokohamaOutsideSources: GuideSource[] = [
  { id: "ya-cubic-locker", title: "キュービックプラザ新横浜・ロッカー", url: "https://www.cubicplaza.com/facilities/coin-locker", checkedAt: "2026-10-07", scope: "7設置区域ごとの寸法（幅/奥行/高さ）、料金・日額/12時間上限、24時間/4:30〜24:30を確認。精密な機器点・決済方法は未確認。", usage: "facts-only" },
  { id: "ya-cubic-service", title: "キュービックプラザ新横浜・設備", url: "https://www.cubicplaza.com/facilities/", checkedAt: "2026-10-07", scope: "横浜線改札内ロッカー、多目的トイレとおむつ替えの9階、3F/6F授乳室、3F/10F AED、1F/2F ATM。室入口・設備台数は別確認。", usage: "facts-only" },
  { id: "ya-mugic", title: "Studio MUGIC・カフェ＆荷物", url: "https://mugic.jp/piano/", checkedAt: "2026-10-07", scope: "非会員利用可、30L専用袋600円、受付日のみ営業、予約不要。店頭コインロッカーの存在。カフェ1人1品注文、トイレはカフェ/スタジオ専用。外から入る条件は会場案内と照合。", usage: "facts-only" },
  { id: "ya-exterior-services", title: "横浜アリーナ・施設外の店舗", url: "https://www.yokohama-arena.co.jp/floormap/", checkedAt: "2026-10-07", scope: "ローソン横浜アリーナ店は24時間・年中無休。MUGICと併設店舗は外から入る。会場内からの出入口と同一視しない。", usage: "facts-only" },
  { id: "ya-tokyu-locker", title: "東急・新横浜駅ロッカー", url: "https://www.tokyu.co.jp/area/shin-yokohama/station/coin-locker/", checkedAt: "2026-10-07", scope: "A南改札内階段付近・B出口5B付近・C出口7付近。設置図と駅平面図の同階・改札境界を照合。料金・サイズ・取り出し時間は個別未確認。", usage: "facts-only" },
  { id: "ya-tokyu-station", title: "東急・新横浜駅平面図", url: "https://www.tokyu.co.jp/area/shin-yokohama/station/", checkedAt: "2026-10-07", scope: "現行ページの2024年6月25日付B1F平面図。出口7/8/5B、北/南改札、ロッカー3区域、男女/多機能トイレ2区域、AED2記号、地上/デッキへのEV3記号。連続経路・当日の開放・機器全数は別確認。", usage: "facts-only" },
  ...yokohamaTransferSources,
  ...yokohamaOperatorSources,
];
const luggage = (id: string, name: string, floor: string, location: string, detail: string, sourceIds: string[], staffed = false): GuideFacility => ({ id, name, floor, location, detail, sourceIds, purpose: "荷物", scope: "場外", precision: "text-only", storageKind: staffed ? "staffed" : "coin" });
const cubic = (id: string, name: string, floor: string, purpose: GuideFacility["purpose"], kind: string, detail: string): GuideFacility => ({ id: `ya-cubic-${id}`, name: `キュービックプラザ・${name}`, floor, purpose, kind, scope: "場外", precision: "text-only", location: "新横浜駅・キュービックプラザ", detail, sourceIds: ["ya-cubic-service"] });
const accessibleFloors = ["B2F", "1F", "4F", "5F", "6F", "7F", "8F", "9F", "10F"];
export const yokohamaOutsideFacilities: GuideFacility[] = [
  luggage("ya-cubic-taxi", "新横浜駅・タクシー乗り場脇ロッカー", "1F", "キュービックプラザ・タクシー乗り場脇", "24時間。小500円・中600円・大800円／日。寸法（幅×奥行×高さ、mm）：大352×678×872。中352×678×516／342×663×561、小352×678×325／342×663×325。", ["ya-cubic-locker"]),
  luggage("ya-cubic-hotel", "新横浜駅・ホテル側ロッカー", "1F", "キュービックプラザ・ホテルアソシア側エレベーターホール横", "24時間。小500円・中600円・大800円／日。寸法（幅×奥行×高さ、mm）：大342×663×856、中342×663×502、小342×663×325。", ["ya-cubic-locker"]),
  luggage("ya-cubic-wc", "新横浜駅・公衆トイレ横ロッカー", "1F", "キュービックプラザ・公衆トイレ横", "24時間。小500円・中600円・大800円／日。寸法（幅×奥行×高さ、mm）：大342×663×856、中342×663×561／502、小342×663×325。", ["ya-cubic-locker"]),
  luggage("ya-cubic-shinkansen", "新横浜駅・新幹線東側改札前ロッカー", "2F", "キュービックプラザ・東海道新幹線東側改札前", "4:30〜24:30。小600円・中700円・大900円／日。寸法（幅×奥行×高さ、mm）：大352×678×872、中352×678×516、小352×678×325。", ["ya-cubic-locker"]),
  luggage("ya-cubic-west-escalator", "新横浜駅・西側エスカレーター横ロッカー", "2F", "キュービックプラザ・西側エスカレーター横", "4:30〜24:30。小500円・中600円・大800円／日。寸法（幅×奥行×高さ、mm）：大352×603×872、中352×603×565、小352×603×325。", ["ya-cubic-locker"]),
  luggage("ya-cubic-west-elevator", "新横浜駅・西側エレベーターホールロッカー", "2F", "キュービックプラザ・西側エレベーターホール", "4:30〜24:30。小30分100円・中20分100円・大10分100円。12時間ごとの上限は小700円・中800円・大900円。寸法（幅×奥行×高さ、mm）：大352×678×872、中352×678×516、小352×678×325。", ["ya-cubic-locker"]),
  luggage("ya-cubic-east", "新横浜駅・ビックカメラ側ロッカー", "3F", "キュービックプラザ・東側エレベーター前", "4:30〜24:30。小500円・中600円・大800円／日。寸法（幅×奥行×高さ、mm）：大342×663×856、中342×663×502、小342×663×325。", ["ya-cubic-locker"]),
  luggage("ya-cubic-jr", "新横浜駅・横浜線改札内ロッカー", "2F", "JR横浜線改札内・北口方面への階段下、エレベーター横", "4:30〜24:30。取り出し時も改札への入場が必要です。料金は現地表示を確認してください。", ["ya-cubic-service", "ya-jr-locker-locations"]),
  ...yokohamaStationFacilities,
  ...yokohamaTransferStorage,
  ...yokohamaOperatorFacilities,
  luggage("ya-mugic-cloak", "Studio MUGIC 荷物預かり", "1F", "横浜アリーナ併設・Studio MUGIC", "30L専用袋に入る荷物を600円（税込）で預かります。予約不要。受付日と時間は店舗のXで案内されます。", ["ya-mugic"], true),
  luggage("ya-mugic-locker", "Studio MUGIC 店頭ロッカー", "1F", "横浜アリーナ併設・Studio MUGICの店頭", "コインロッカーの設置案内があります。サイズ・料金・決済方法・取り出せる時間は店舗で確認してください。スタッフへ預ける30L袋のクロークとは別のサービスです。", ["ya-mugic"]),
  { id: "ya-lawson-arena", name: "ローソン 横浜アリーナ店", floor: "1F", purpose: "飲食", kind: "convenience-store", scope: "場外", precision: "diagram-point", location: "横浜アリーナ併設・外側の店舗入口", detail: "24時間営業・年中無休。店舗には外から入ります。横浜アリーナの客席・ロビーからは入れません。", sourceIds: ["ya-exterior-services", "floor-outside-map"], anchor: { diagramId: "ya-venue-exterior", x: 83, y: 486, sourceIds: ["floor-outside-map"], reference: "公式施設外図の店舗引出線の終点。入口矢印・個別ドア・ロッカー機器点とは区別する。" } },
  { id: "ya-mugic-cafe", name: "Studio MUGIC カフェ", floor: "1F", purpose: "飲食", kind: "cafe", scope: "場外", precision: "diagram-point", location: "横浜アリーナ併設・外側の店舗入口", detail: "会員以外も利用できます。スタジオ利用以外は1人1品以上の注文が必要です。営業時間は予約状況で変わるため店舗へ確認してください。トイレはスタジオ・カフェ利用者用です。", sourceIds: ["ya-mugic", "ya-exterior-services", "floor-outside-map"], anchor: { diagramId: "ya-venue-exterior", x: 591, y: 495, sourceIds: ["floor-outside-map"], reference: "公式施設外図の店舗引出線の終点。入口矢印・個別ドア・ロッカー機器点とは区別する。" } },
  ...accessibleFloors.map(floor => ({ ...cubic(`accessible-${floor}`, "多目的トイレ", floor, "トイレ", "accessible", `${floor}の多目的トイレ。1F・9Fはオストメイト対応です。利用する階の開館時間をご確認ください。`), toiletType: "accessible" as const })),
  ...accessibleFloors.map(floor => cubic(`diaper-${floor}`, "おむつ替えシート", floor, "赤ちゃん", "diaper", `${floor}の多目的トイレ内にあります。利用する階の開館時間をご確認ください。`)),
  cubic("nursing-3F", "ベビーケアルーム mamaro", "3F", "赤ちゃん", "nursing", "7:00〜21:00。授乳・おむつ替え・離乳食に利用できます。"),
  cubic("nursing-6F", "授乳室", "6F", "赤ちゃん", "nursing", "10:00〜21:00。授乳コーナー2台、おむつ替えベビーベッド4台、給湯器があります。"),
  cubic("aed-3F", "AED", "3F", "AED", "aed", "3Fに設置されています。個別位置は館内の表示・施設スタッフへご確認ください。"),
  cubic("aed-10F", "AED", "10F", "AED", "aed", "10Fに設置されています。個別位置は館内の表示・施設スタッフへご確認ください。"),
  cubic("atm-1F", "ATM（りそな銀行）", "1F", "案内", "atm", "1Fのりそな銀行ATM。稼働時間・取扱いは銀行の案内をご確認ください。"),
  cubic("atm-2F", "ATM（横浜銀行・みずほ銀行・ゆうちょ銀行）", "2F", "案内", "atm", "2Fの銀行ATM案内。稼働時間・取扱いは利用する銀行の案内をご確認ください。"),
];
// Access sketch uses venue/station representative areas. No locker point is
// fabricated from its postal address or station name.
export const yokohamaOutsideDiagram: GuideDiagram = {
  id: "ya-access-current", scope: "場外", floor: "場外", viewBox: [0, 0, 1100, 800], concoursePaths: [],
  contextPaths: ["M620 130L910 215L890 390L640 445L535 330L550 205Z", "M150 565L450 565L475 635L185 665Z"],
  landmarks: [
    { id: "ya-main-area", label: "正面入口側", name: "横浜アリーナ正面入口側", kind: "entrance", x: 635, y: 445, sourceIds: ["access", "floor-outside"], reference: "正面入口方面の代表区域。精密なドアや当日の指定入口ではない。" },
    { id: "ya-jr-station", label: "新横浜駅", name: "JR新横浜駅 北口・新幹線東口", kind: "station", x: 295, y: 630, sourceIds: ["access"], reference: "JR駅の代表区域。キュービックプラザの個別ロッカー位置ではない。" },
    { id: "ya-subway-area", label: "出口7・8方面", name: "新横浜駅 出口7・8方面", kind: "exit", x: 365, y: 455, sourceIds: ["access"], reference: "出口7・8を使う方面の代表札。出口を自動選択しない。" },
  ],
  evidence: { sourceIds: ["access", "floor-outside"], file: "research/arena-pair-current-2026-10-05/yokohama-access.html", sha256: "64106ea9d45cbeda8730a2580c2bf4aa5957ba8826ad3e80c570d421482e0e8f", width: 1100, height: 800, method: "公式アクセスの位置関係を北上の略図に整理。経路・距離比例・入口位置の図ではない。", status: "area-schematic-not-route" },
};
