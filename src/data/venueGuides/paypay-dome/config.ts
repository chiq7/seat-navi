import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";

export const paypayStandSeats = seats as StandMapData;
export const paypayLevels = [
  { id: "front", label: "前方", color: "#b4d0ee", point: [835, 1250] },
  { id: "middle", label: "中段", color: "#efc27d", point: [835, 1350] },
  { id: "upper", label: "後方", color: "#a5d89e", point: [835, 1460] },
  { id: "outfield", label: "外野", color: "#a1c5c1", point: [835, 240] },
];
export const paypayAreas = [{ id: "all", label: "全体" }, { id: "1塁側", label: "1塁側" }, { id: "3塁側", label: "3塁側" }];
export const paypayFacilityConfig: FacilityConfig = {
  defaultFloor: "3F", floors: ["1F", "2F", "3F", "4F", "5F", "6F"],
  groups: current.groups as FacilityGroup[], meta: current.meta as Record<string, FacilityMeta>,
  primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.filter(m => m.kind === "gate" || m.kind === "passage" || m.kind === "station").map(m => m.id)])),
  aliases: current.aliases, outsideDiagramId: "paypay-deck",
  landmarkFacilityIds: current.landmarkFacilityIds,
  landmarkPlaceholder: { inside: "例：1ゲート / 2番通路", outside: "例：4ゲート" },
  outsideViews: [
    { id: "grounds", label: "駅〜ドーム周辺", diagramId: "paypay-grounds", floorLabel: "ドーム・唐人町駅周辺", northUp: true, venueLabel: { name: "みずほPayPayドーム", point: [550,550] } },
    { id: "deck", label: "デッキ・外周", diagramId: "paypay-deck", floorLabel: "3Fデッキ・1F外周", northUp: true, venueLabel: { name: "みずほPayPayドーム", point: [550,550] } },
    { id: "tojinmachi", label: "唐人町駅", diagramId: "paypay-tojinmachi", floorLabel: "唐人町駅・場所一覧" },
    { id: "nearby", label: "周辺施設", diagramId: "paypay-nearby", floorLabel: "ドーム外・別棟の場所一覧" },
    { id: "hakata", label: "博多駅の荷物", diagramId: "paypay-hakata", floorLabel: "博多駅・場所一覧" },
  ],
  coverage: { description: "公式の階付き設備点を北上の独立略図へ部分接続。駅・店舗の個別点がない施設は場所一覧で案内します。室入口・連続経路ではありません。", sourceIds: ["official-digital","access","station","crosta"] },
};
