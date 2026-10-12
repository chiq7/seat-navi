import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import seats from "./seats.json";
import current from "./current-facilities.json";
export const mufgSeats = seats as StandMapData;
export const mufgLevels = [{id:"f1",label:"1層",color:"#bfdced",point:[1420,1500]},{id:"f2",label:"2層",color:"#e9d5ad",point:[1420,1700]},{id:"f3",label:"3層",color:"#b5d8bd",point:[1420,1940]}];
export const mufgAreas = [{id:"all",label:"全体"},...["メインスタンド","バックスタンド","北サイドスタンド","南サイドスタンド"].map(id=>({id,label:id}))];
export const mufgFacilityConfig: FacilityConfig = {
 defaultFloor:"1F",floors:["1F","2F","3F","4F","5F"],groups:current.groups as FacilityGroup[],meta:current.meta as Record<string,FacilityMeta>,aliases:current.aliases,landmarkFacilityIds:current.landmarkFacilityIds,
 primaryLandmarks:Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(m=>m.id)])),outsideDiagramId:"mufg-grounds",
 landmarkPlaceholder:{inside:"例：A / E / 青山門",outside:"例：A2 / 千駄ヶ谷門 / NTTドコモ"},
 outsideViews:[{id:"grounds",label:"敷地・入場前",diagramId:"mufg-grounds",floorLabel:"ゲート・外構"},{id:"access",label:"駅・周辺",diagramId:"mufg-access",floorLabel:"駅と会場の位置関係"},{id:"nearest",label:"最寄り駅の荷物",diagramId:"mufg-nearest",floorLabel:"国立競技場・千駄ケ谷・信濃町"},{id:"transfer",label:"新宿駅",diagramId:"mufg-transfer",floorLabel:"乗換駅・場所一覧"},{id:"store",label:"予約預かり店舗",diagramId:"mufg-store",floorLabel:"新宿西口・場所一覧"}],
 coverage:{description:"1・2・4Fのスタンド設備、改修中の3F、5F空の杜、敷地・駅・新宿の荷物を分けて探せます。点は参考区域で、精密入口・連続経路は確認中です。",sourceIds:["map","faq","toei","food"]}
};
