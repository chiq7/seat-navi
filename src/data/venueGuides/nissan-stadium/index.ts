import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";
import current from "./current-facilities.json";
import { nissanSeats } from "./config";

export const nissanGuide: DedicatedVenueGuide = {
  venueId: "nissan-stadium", name: "日産スタジアム", seatTypes: ["1階席", "2階席"],
  seatNote: "N・E・W・Sのスタンドと1階席・2階席から探せます。通常席の前後列と、原図で確認した列端の印字番号を一部検索できます。北下・北上・南上の後方帯は列目印でも確認できます。中間の列・番号は確認中です。E13・N21などの入口名や地図からも選べます。",
  diagramNote: "券面の1階席は設備の4・5F、2階席は6・7Fです。常設授乳室はなく、おむつ交換は男女すべてのトイレにあります。使用ゲート・開放区域・預かり対応は主催者案内を確認してください。",
  seats: nissanSeats.blocks.map(b => ({ id: b.id, label: b.label, type: b.level, floor: b.equipmentFloor ?? b.level, x: b.center[0], y: b.center[1], rows: b.rows.map(r => ({ label: r.label })), sourceIds: b.sourceIds })),
  sources: current.sources as GuideSource[], facilities: current.facilities as GuideFacility[], diagrams: current.diagrams as GuideDiagram[],
  routes: [
    { id: "nissan-jr", from: "新横浜駅", exit: "JR新幹線・横浜線", stops: ["会場外構"], destination: "日産スタジアム", note: "公式目安は徒歩14分。地図は位置関係です。指定ゲート・混雑・信号によって時間は変わり、最短・段差なし経路を示していません。", sourceIds: ["walk", "access"] },
    { id: "nissan-rail", from: "新横浜駅", exit: "地下鉄・相鉄東急新横浜線／周辺図の10番出口（旧8番）", stops: ["会場外構"], destination: "日産スタジアム", note: "公式目安は徒歩12分。段差なしの連続経路・当日開放は主催者と駅の案内を確認してください。", sourceIds: ["walk", "access"] },
    { id: "nissan-ko", from: "小机駅", exit: "JR横浜線", stops: ["会場外構"], destination: "日産スタジアム", note: "公式目安は徒歩7分。公演の指定入口は券面を確認。精密な連続経路は確認中です。", sourceIds: ["walk", "access"] },
  ],
  unverified: [
    "現行公式座席図の通常2層と48入口から参考範囲を接続。色の連結成分と個別に読図した区域であり、全物理ブロック全数・全列番号の再現ではありません。主要通常席84範囲の前後列と115個の印字列番号キーを部分接続し、南側の下層後列10範囲の階分類を訂正しました。番号なしの列目印6範囲を北下・北上・南上の後方帯へ補い、参考領域は313です。北下は19/31列、北上・南上は14列側のみで、上層後端は未確認です。キー数は席数・収容数ではありません。入口を担当全席の境界と断定しません。残る印字分断・階段内側の空白・全境界・札は最終比較待ちです。",
    "LiveWalker20191007補助図と主要2層・前後の通路・入口を比較。現行のVIP/プレス/ペア/カウンター周辺とは差があるため、古い券種と番号を現行普通席へ補間しません。数値検索は現行公式図で読めた列端の個別番号だけです。隣の開始番号までや全列に番号を延長せず、中間番号・未対応列は確認中として入口名・地図へ案内します。",
    "4〜7F設備図の主要男女トイレ・EV・4F AED2区域・4/5Fの21店名と6F売店を接続。7Fは凡例からトイレを作らずEVを掲載。多目的トイレは公式FAQの4・5F合計28か所ですが、精密な個別位置は図外一覧です。全記号・イベント開放・券種間通行は未確認です。",
    "館内スーツケース預かりは主催者により異なるという公式回答。館内常設ロッカーの現行個別情報は未確定で、不存在と断定しません。ベビーカーの入口対応はサッカー試合時とその他イベントを区別。常設授乳室なしと主催者の設置有無を区別します。",
    "第2レストハウスは貴重品専用、第3は一般有料ロッカー。FAQのロッカー時間と個別ページの建物・窓口時間は異なるため併記。収納寸法・大荷物・当日臨時閉鎖・公園内の精密入口は未確認です。古い管理事務所前のロッカー告知を現行稼働へ昇格しません。",
    "新横浜CUBICの7区域の寸法/料金/時間、JR/市営/東急の別区域と小机・北新横浜、個別予約店舗を図外一覧に接続。ほかの未確認機械・料金・時間・改札境界、重複区域、空きや予約結果は未確認です。カラオケ営業時間をBounce受付へ転用しません。",
    "OpenPOI中心35.5103,139.6063・半径800mの飲食20候補/荷物0をlicenses/attributions付きで保持。候補を確認済み施設へ昇格しません。Livebu指定検索は404で会場別ページの特定未完。原画像/PDF/ロゴをpublicへ複製していません。全境界/全条件・実機多点入力と最終目視は後段です。",
  ],
  rights: { url: "https://cdn-zaseki.music-mdata.com/pdf/9881.pdf", checkedAt: "2026-10-10", status: "publish-use-unconfirmed", note: "MUSIC-MDATA掲載・LiveWalker作成20191007。無断転載・再配布禁止。事実の照合だけに使用し、原図/PDF/ロゴをpublicへ複製しません。ダウンロード可能を転載許諾と扱いません。" },
};
