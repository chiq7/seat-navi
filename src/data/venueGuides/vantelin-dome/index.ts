import current from "./current-facilities.json";
import seats from "./stand-seats.json";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility, GuideSource } from "../types";

const numberedRanges = seats.blocks.filter(b => b.numberReference).length;

export const vantelinDomeGuide: DedicatedVenueGuide = {
  venueId: "vantelin-dome", name: "バンテリンドーム ナゴヤ",
  seatTypes: ["下段", "上段", "パノラマ", "ウイング", "プライム"],
  seatNote: "下段・上段・パノラマの確認できた列とL/R番号、2026ウイングのA/B/C列を検索できます。プライムは別の展開図で、ツインの列とL/R番号、ボックスの番号、レストランのF/H番号を探せます。球場全体への正確な配置や一部の特殊席番号は確認中です。公演別アリーナは描いていません。",
  diagramNote: "館内2〜5F、ゲート・デッキ、近隣モールと乗換駅を別々の図で案内します。位置関係の略図で、公演指定入口や歩行経路ではありません。",
  seats: seats.blocks.map(b => ({ id: b.id, label: b.label, type: b.level, floor: b.level,
    x: b.center[0], y: b.center[1], rows: b.rows.map(r => ({ label: r.label, ranges: r.segments.map(s => ({ start: s.start, end: s.end, passage: "通路の対応は確認中" })) })), sourceIds: b.sourceIds })),
  facilities: current.facilities as GuideFacility[], diagrams: current.diagrams as GuideDiagram[],
  sources: current.sources as GuideSource[], routes: [
    { id: "vantelin-yada-access", from: "地下鉄・ゆとりーとライン ナゴヤドーム前矢田駅", exit: "地下鉄1番出口", stops: [], destination: "バンテリンドーム ナゴヤ", note: "徒歩約5分の公式目安。個別の入場ゲートと当日の規制は公演案内を確認してください。", sourceIds: ["outside-access", "outside-guide-2026"] },
    { id: "vantelin-ozone-access", from: "JR・名鉄 大曽根駅", exit: "個別出口は確認中", stops: [], destination: "バンテリンドーム ナゴヤ", note: "徒歩約15分の公式目安。会場までの連続経路や公演指定入口を確定する案内ではありません。", sourceIds: ["outside-access", "outside-guide-2026"] },
  ],
  unverified: [
    "座席・場内・場外・荷物の主要導線を一次接続。左181・201番側の33/34列、左661・681番側と右601番側34列、車いす周辺、他層の未対応部分・特殊席の精密対応は後段に残す。一次制作の区切りを全席収録・全条件合格・数値90%以上の完成と扱わない。",
    `番号接続済み${numberedRanges}物理範囲と、番号未接続の${seats.blocks.length-numberedRanges}参考領域を表示。${seats.blocks.length}領域を確認済み物理ブロック全数や収容席数とは呼ばない。`,
    "2026年ウイングの通常席250番号とウイング6の各セットを部分接続。B/C列の29・30は補間しない。右車いすウイングは車いす区画2と介添え椅子4を普通席6席へ変えず番号接続を保留。プライムは648検索番号を別の展開図へ部分接続し、車いす記号付き5番号を保留。検索番号を椅子数へ換算せず、券種A/B/Sの境界・Fの2名セット対応・球場全体への配置と連続通路・公演別開放は未確定。",
    "下段前方L/R1〜420と25〜34列の左右700番付近（左181・201番側は25〜32列）、中央部と上段35〜47列の左右700番付近とパノラマの左右561番付近までを個別公式応答で部分照合。閉じない通路は別ブロックへ分離し、内部空白・若い側の辺中点札・短い矢印を保持。図が異なる家具/列と車いす周辺、他の列・番号は確認中。PDFの開始番号から終端・欠番を推定しない。座席階と設備階の対応はnullを保持。",
    "トイレ・EV・AED・ベビールームは2026階別図の記号代表点。設備全数・室入口・当日の開放は未確定。飲食店は個別店名検索と店舗帯の代表札で、店入口ピンを作らない。",
    "館内ロッカー5区域に加え、モールの無料ロッカー6、JR名古屋12、エスカ・ゲートタワー・タカシマヤ有人の3件を接続。最寄り矢田/大曽根のロッカー現行点は追加確認中で、存在しないとは扱わない。モールその他設備の全数・機械寸法/時間/条件と館外単独ロッカーの確定も残す。",
    "OpenPOI1800m荷物検索は候補0件。周辺ロッカー不存在を意味しない。ユーザー目視・実機多点・全受入は後段。",
  ],
  rights: { url: "https://zaseki.music-mdata.com/detail/15156/1", checkedAt: "2026-10-09",
    status: "publish-use-unconfirmed", note: "原PDF・階別画像・ロゴは調査保管のみ。独立した部分略図をローカル接続。公開利用条件は未確定。" },
};
