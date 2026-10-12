import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import seats from "./seats.json";
import current from "./current-facilities.json";
export const koshienSeats = seats as StandMapData;
export const koshienLevels = [{id:"infield",label:"内野",color:"#bed9f0",point:[1600,1450]},{id:"alps",label:"アルプス",color:"#a0cbc4",point:[1860,1000]},{id:"outfield",label:"外野",color:"#dbdaae",point:[1500,320]}];
export const koshienAreas = [{id:"all",label:"全体"},...["1塁側","3塁側","バックネット裏","レフト","ライト"].map(id=>({id,label:id}))];
export const koshienFacilityConfig: FacilityConfig = {
 defaultFloor:"内野・アルプス2F",floors:["内野・アルプス1F","内野・アルプス2F","内野・アルプス3F","外野1F","外野2F","外野3F"],groups:current.groups as FacilityGroup[],meta:current.meta as Record<string,FacilityMeta>,aliases:current.aliases,landmarkFacilityIds:current.landmarkFacilityIds,
 primaryLandmarks:Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(m=>m.id)])),outsideDiagramId:"koshien-grounds",
 landmarkPlaceholder:{inside:"例：2-F / 3-H / 16号門",outside:"例：甲子園プラス / 1号門"},
 outsideViews:[{id:"grounds",label:"敷地・入場前",diagramId:"koshien-grounds",floorLabel:"ゲート・外周"},{id:"access",label:"駅・周辺",diagramId:"koshien-access",floorLabel:"駅前広場・球場・別施設"},{id:"nearest",label:"甲子園駅",diagramId:"koshien-nearest",floorLabel:"駅・場所一覧"},{id:"museum",label:"甲子園プラス",diagramId:"koshien-museum",floorLabel:"2F歴史館・場所一覧"},{id:"transfer",label:"大阪梅田駅",diagramId:"koshien-transfer",floorLabel:"乗換駅・場所一覧"},{id:"store",label:"予約預かり店舗",diagramId:"koshien-store",floorLabel:"梅田・場所一覧"}],
 coverage:{description:"内野・アルプス/外野の各階、外周、駅、甲子園プラス、梅田の荷物預かりを分けて探せます。点は参考区域で、個別入口・連続経路は確認中です。",sourceIds:["map-entry","faq","museum","station"]}
};
