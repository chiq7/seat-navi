import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import fixed from "./seats.json";
import current from "./current-facilities.json";

export type EdionMode = "first" | "second";
export const edionFixedSeats = fixed as StandMapData;
export const edionSecondSeats: StandMapData = {
  diagramId: "edion-second-seats",viewBox:[300,160,550,420],detailSpan:350,wholeBlockLabels:true,
  frontLabel:"第2競技場（配置は催しごと）",searchPlaceholder:"例：第2競技場",
  numberLookupNote:"第2競技場の席・列番号は催しごとの配置です。再開後は主催者案内を確認してください。",
  blocks:[{id:"edion-second-hall",label:"第2競技場",aliases:["第2競技場","第二競技場"],level:"second",area:"第2競技場",balcony:false,
    path:"M488 208 H738 V509 H488 Z",box:[488,208,250,301],center:[613,359],rows:[],neighbors:[],numberReference:null,numberLookup:"unavailable",equipmentFloor:null,
    sourceIds:["facilities"],seatNote:"B2Fの改修前参考輪郭です。常設観客席の番号を作りません。リング・ステージ・席配置は主催者案内を確認してください。"}],
};
export const edionSeats = {first:edionFixedSeats,second:edionSecondSeats};
export function edionLevels(mode:EdionMode) {return mode === "first" ? [{id:"fixed",label:"固定席・改修前",color:"#eed7a3",point:[500,110]}] : [{id:"second",label:"第2競技場",color:"#c5d2e8",point:[600,250]}];}
export function edionAreas(mode:EdionMode) {return [{id:"all",label:"全体"},...(mode === "first" ? [..."ABCDEFGH"] : ["第2競技場"]).map(id=>({id,label:id}))];}
export const edionFacilityConfig:FacilityConfig = {
  defaultFloor:"1F・改修前",floors:["B2F・改修前","B1F・改修前","1F・改修前","2F・改修前","3・4F・改修前"],
  groups:current.groups as FacilityGroup[],meta:current.meta as Record<string,FacilityMeta>,aliases:current.aliases,landmarkFacilityIds:current.landmarkFacilityIds,landmarkGroupIds:current.landmarkGroupIds,
  primaryLandmarks:Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(l=>l.id)])),outsideDiagramId:"edion-access",
  outsideViews:[
    {id:"access",label:"周辺・駅出口",diagramId:"edion-access",floorLabel:"公式図の場所関係。精密入口・歩行経路ではありません",northUp:true},
    {id:"station",label:"駅・店舗の荷物",diagramId:"edion-station",floorLabel:"図外一覧から選べます。店舗一覧の札は実店舗の位置ではありません",northUp:true},
  ],
  landmarkPlaceholder:{inside:"例：東ロビー / 玄関ホール",outside:"例：南海 / OCAT / トラベルハブ"},
  coverage:{description:"全館休館中です。館内図は改修前の参考で再開後は確認中。駅・店舗の現行荷物案内は図外一覧から探せます。",sourceIds:["home","facilities","access","nankai-locker","metro-plan","youcarry","airporter","ocat"]},
};

export function makeEdionFacilityConfig(mode:EdionMode):FacilityConfig { return {...edionFacilityConfig,defaultFloor:mode === "second" ? "B2F・改修前" : "1F・改修前"}; }
