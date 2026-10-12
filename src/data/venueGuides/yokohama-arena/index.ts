import evidence from "./floor-evidence.json";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import stands from "./stand-seats.json";
import { yokohamaOutsideDiagram, yokohamaOutsideFacilities, yokohamaOutsideSources } from "./outside";
import { yokohamaStationDiagram } from "./station";
import { yokohamaExteriorDiagram } from "./exterior";
import { yokohamaInsideFacilities, yokohamaInsideReferenceIds, yokohamaInsideSources, yokohamaInsideUnknownDiagram } from "./inside-services";

export const yokohamaArenaGuide: DedicatedVenueGuide = {
  venueId: "yokohama-arena", name: "横浜アリーナ",
  seatNote: "アリーナ席はA〜F、スタンド席は東西南北です。列欄にA15・北5などの区画と列、番号欄に席番号を入力できます。センター席・使用するブロックとステージは公演案内をご確認ください。",
  diagramNote: "会場1〜3F、会場・駅周辺、会場の外側入口、新横浜駅B1Fを切り替えられます。駅の改札内設備は会場チケットだけでは利用できません。駅ビル・店舗の図上位置がない施設は場所一覧に掲載します。",
  seatTypes: ["アリーナ席", "スタンド席"], seats: stands.blocks.map(b => ({ id: b.id, label: b.label, type: b.level, floor: b.equipmentFloor ?? "設備階未確認", x: b.center[0], y: b.center[1], rows: b.rows.map(r => ({ label: r.label })), sourceIds: b.sourceIds })), routes: [],
  facilities: [...(evidence.facilities as GuideFacility[]).map(f => ({ ...f, sourceIds: [...f.sourceIds, ...yokohamaInsideReferenceIds(f)] })), ...yokohamaInsideFacilities, ...yokohamaOutsideFacilities],
  diagrams: [...evidence.diagrams as GuideDiagram[], yokohamaOutsideDiagram, yokohamaStationDiagram, yokohamaExteriorDiagram, yokohamaInsideUnknownDiagram],
  sources: [...evidence.sources as GuideSource[], ...yokohamaInsideSources, ...yokohamaOutsideSources, { id: "seat-central-current", title: "公式中央パターン座席図", url: "https://www.yokohama-arena.co.jp/common/img/seatguide/img_seatzoom_03.png", checkedAt: "2026-10-07", scope: "A/Dの1〜11・13〜22列、B/C/E/Fの1〜10・12〜22列と東西南北スタンドの1〜10列の番号区間・通路。未確認の列・番号を補間しない。", usage: "research-only" }],
  unverified: [
    "館内47記号と階未確認のEV/AED案内2件、場外62件（券売所2・荷物21・キュービックプラザの階別設備24・駅B1Fトイレ/おむつ/AED/EV11記号・併設飲食2・周辺飲食2）を接続。図記号数と実設備台数・個室数は別。1/2Fロッカーの料金/寸法は階単位で確認、区域別のサイズ/台数・決済/再開閉/当日の開放は未確認。",
    "A〜F7362・北1285・東1365・西/南各1050、計12112席キーを接続。A/D12列・B/C/E/F11列は未接続。A12等は列欄で区画+列として受け付け、番号欄のA12を12番へ転用しない。各公演の使用席・センター席・スイートボックス個別席は未対応。",
    "公式施設外図のローソン/MUGIC入口矢印と店舗区域を接続。未掲載テナント・預かりカウンターは位置未確認。エントランスは名称位置であり、当日の指定入場口ではない。",
    "原図ごとの記号中心を保持し、場内外・他階・別ロビーへ位置を転用しない。会場周辺の7/8番出口方面は代表位置。独立駅B1F図の出口7/8/5Bと北/南改札・ロッカー3区域は個別接続。地上出口・会場の指定入場口、駅ビルの個別入口・荷物機器点、歩行経路、連続した段差なし動線は未確認。",
    "充電は公式凡例のサービス表記のみ。料金・対応機種・稼働・利用条件は未確認です。おむつ替え設備を授乳室として扱いません。",
    "原画像/ロゴ・輪郭転記・集合データ・出典リンクの公開利用条件、実機QA、元checkoutへの統合は未完です。",
  ],
  rights: { url: "https://www.yokohama-arena.co.jp/other/rule/", checkedAt: "2026-09-30", status: "publish-use-unconfirmed", note: "公式利用規約の権利・利用制限を確認。原画像/ロゴは調査用のみ。独自の事実表示と部分輪郭・データ集合の公開判断は別途必要です。非公開のローカル検証で、許諾取得や外部問い合わせはしていません。" },
};
