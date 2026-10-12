import type { FacilityConfig, FacilityGroup, FacilityMeta, FacilityOutsideView } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";
export const yoyogiStandSeats = seats as StandMapData;
export const yoyogiLevels = [
  {id:"北1階",label:"北1階",color:"#b3cee1",point:[350,145]}, {id:"南1階",label:"南1階",color:"#e6a8c2",point:[350,385]},
  {id:"北2階",label:"北2階",color:"#b8bde4",point:[350,65]}, {id:"南2階",label:"南2階",color:"#cfb8df",point:[350,465]},
];
export const yoyogiAreas = [{id:"all",label:"全体"},{id:"北",label:"北"},{id:"南",label:"南"}];
export const yoyogiFacilityConfig: FacilityConfig = {
  defaultFloor:"B1F",floors:["B1F","1F","2F","階未確認"],groups:current.groups as FacilityGroup[],meta:current.meta as Record<string,FacilityMeta>,
  primaryLandmarks:Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(m=>m.id)])),
  aliases:{"yoyogi-harajuku":["原宿","原宿駅"],"yoyogi-meiji":["明治神宮前","明治神宮前駅","明治神宮前原宿駅"],"yoyogi-park":["代々木公園","代々木公園駅"],"yoyogi-shibuya":["渋谷","渋谷駅"]},
  outsideDiagramId:"yoyogi-outside",venueLabel:{name:"第一体育館",point:current.venuePoint},landmarkPlaceholder:{inside:"例：北側 / 南側",outside:"例：明治神宮前駅"},
  outsideViews:current.outsideViews as FacilityOutsideView[],landmarkFacilityIds:current.landmarkFacilityIds,
  coverage:{description:"周辺駅と敷地図を別の座標系で表示。駅・門・出入口は周辺を見る目印で、公演の指定入口や経路ではありません。",sourceIds:["surrounding-map","site-plan","access"]},
};
export const yoyogiCapabilities = {rulesVersion:"2.6",geometry:"source-printed-aisle-divided-reference",blocks:72,zones:44,numericSearch:"printed-reference-cells",numberReference:"all-44-charts",ticketTierToEquipmentFloor:null,indoorLocker:"absent-per-official-equipment-list",manualReview:"basic-production-checked-final-pending"};
