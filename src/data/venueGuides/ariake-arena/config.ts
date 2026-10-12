import type { FacilityConfig, FacilityGroup, FacilityMeta, FacilityOutsideView } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";
export const ariakeStandSeats = seats as StandMapData;
export const ariakeLevels = [{ id:"2F",label:"2F",color:"#e6a8c2",point:[585,420] },{ id:"3F",label:"3F",color:"#c9b9df",point:[585,420] },{ id:"4F",label:"4F・5F席",color:"#aeb7e7",point:[585,420] }];
export const ariakeAreas = [{id:"all",label:"全体"},..."ABCDEFGH".split("").map(id=>({id,label:id}))];
export const ariakeFacilityConfig: FacilityConfig = { defaultFloor:"2F",floors:["1F","2F","3F","4F"],groups:current.groups as FacilityGroup[],meta:current.meta as Record<string,FacilityMeta>,
  primaryLandmarks:Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(m=>m.id)])), aliases:{"ariake-shintoyosu":["新豊洲","新豊洲駅"],"ariake-tennis":["有明テニスの森","有明テニスの森駅"],"ariake-kokusai":["国際展示場","国際展示場駅"]},
  outsideDiagramId:"ariake-arena-outside",venueLabel:{name:"有明アリーナ",point:[466,330]},landmarkPlaceholder:{inside:"例：ゲート1",outside:"例：新豊洲駅"},
  outsideViews:current.outsideViews as FacilityOutsideView[],landmarkFacilityIds:current.landmarkFacilityIds,
  coverage:{description:"駅・施設の位置関係と駅構内の設備を探せます。来場・帰りの指定ルートは公式案内をご確認ください。",sourceIds:["ariake-access-map","ariake-shintoyosu-plan","ariake-tennis-plan"]} };
export const ariakeCapabilities = {rulesVersion:"2.6",geometry:"aisle-bounded-fixed-stand",numericSearch:"printed-row-intervals",sourceSymbols:161,roomCounts:null,manualReview:"final-adjustment-pending"};
