import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import seats from "./seats.json";
import current from "./current-facilities.json";
export const zozoSeats = seats as StandMapData;
export const zozoLevels = [{id:"lower",label:"下段",color:"#a8cdf2",point:[1410,1000]},{id:"upper",label:"上段",color:"#a7d3b0",point:[1590,1000]},{id:"outfield",label:"外野",color:"#ecd3a8",point:[1260,290]}];
export const zozoAreas = [{id:"all",label:"全体"},...["1塁側","3塁側","バックネット裏","レフト","ライト"].map(id=>({id,label:id}))];
export const zozoFacilityConfig: FacilityConfig = {
 defaultFloor:"2F",floors:["1F","2F","3F","4F"],groups:current.groups as FacilityGroup[],meta:current.meta as Record<string,FacilityMeta>,aliases:current.aliases,landmarkFacilityIds:current.landmarkFacilityIds,
 primaryLandmarks:Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(m=>m.id)])),outsideDiagramId:"zozo-grounds",
 landmarkPlaceholder:{inside:"例：206 / 209 / 412",outside:"例：海浜幕張 / チケット窓口"},
 outsideViews:[{id:"grounds",label:"敷地・入場前",diagramId:"zozo-grounds",floorLabel:"ゲート・外周",venueLabel:{name:"ZOZOマリン",point:[410,310]}},{id:"access",label:"駅・周辺施設",diagramId:"zozo-access",floorLabel:"海浜幕張・幕張メッセ"},{id:"nearest",label:"海浜幕張駅",diagramId:"zozo-nearest",floorLabel:"改札外・場所一覧"},{id:"transfer",label:"東京駅",diagramId:"zozo-transfer",floorLabel:"乗換駅・場所一覧"},{id:"store",label:"予約預かり店舗",diagramId:"zozo-store",floorLabel:"海浜幕張・場所一覧"}],
 coverage:{description:"場内1〜4F、外周ロッカー、海浜幕張駅・東京駅・店舗預かりを切り替えて探せます。図は参考区域で、入口や連続経路は確認中です。",sourceIds:["gourmet","current-map","locker-change"]}
};
