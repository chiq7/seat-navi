import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import exhibition from "./exhibition.json";
import main from "./main.json";
import current from "./current-facilities.json";

export type TokiMode = "exhibition" | "main";
export const tokiSeats = { exhibition: exhibition as StandMapData, main: main as StandMapData };
export function tokiLevels(mode: TokiMode) {
  return [{ id: mode, label: mode === "exhibition" ? "展示ホール1F" : "メインホール2F", color: "#c5dbdf", point: [550,260] }];
}
export function tokiAreas(mode: TokiMode) {
  return [{ id:"all",label:"全体" }, ...(mode === "exhibition" ? ["展示ホールA","展示ホールB"] : ["メインホール"]).map(id=>({id,label:id}))];
}
export function makeTokiFacilityConfig(mode: TokiMode = "exhibition"): FacilityConfig {
  return {
    defaultFloor: mode === "exhibition" ? "展示場1F" : "会議場2F",
    floors:["展示場1F","入口1F","会議場2F","エスプラナード2F","会議場3F","会議場4F"],
    groups:current.groups as FacilityGroup[],meta:current.meta as Record<string,FacilityMeta>,aliases:current.aliases,
    landmarkFacilityIds:current.landmarkFacilityIds,landmarkGroupIds:current.landmarkGroupIds,
    primaryLandmarks:Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(l=>l.id)])),
    outsideDiagramId:"toki-grounds",
    outsideViews:[
      { id:"grounds",label:"会場・駅・周辺",diagramId:"toki-grounds",northUp:false,floorLabel:"公式資料の位置関係を整理した区域図。入口・連続経路・距離の精密地図ではありません" },
      { id:"station",label:"駅・入場前の荷物",diagramId:"toki-station",northUp:false,floorLabel:"館内ロッカーと新潟駅の荷物は一覧から選べます。札は機械位置ではありません" },
    ],
    landmarkPlaceholder:{inside:"例：アトリウム / 展示ホールA",outside:"例：新潟駅 / 万代島ビル"},
    coverage:{description:"展示場・入口・会議場・エスプラナードを階ごとに分けています。万代島ビルの店舗は場外一覧へ。公演指定入口・各室の開放は主催者案内をご確認ください。",sourceIds:["info-current","faq-current","floor_1f_entrance","floor_2f_esplanade","access-current","shops-current","sagawa","cocolo-sagawa"]},
  };
}
export const tokiFacilityConfig = makeTokiFacilityConfig();
