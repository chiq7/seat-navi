import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import baseball from "./baseball-seats.json";
import soccer from "./soccer-seats.json";
import current from "./current-facilities.json";
export type SapporoMode = "baseball" | "soccer";
export const sapporoSeats = { baseball: baseball as StandMapData, soccer: soccer as StandMapData };
export const sapporoLevels = [{id:"stand",label:"スタンド",color:"#b4d0ee",point:[365,555]}];
export const sapporoAreas = [{id:"all",label:"全体"},...["北側","南側","東側","西側"].map(id=>({id,label:id}))];
export const sapporoFacilityConfig: FacilityConfig = {
 defaultFloor:"1F",floors:["B2F","1F","2F","3F","4F","展望台"],groups:current.groups as FacilityGroup[],meta:current.meta as Record<string,FacilityMeta>,
 aliases:current.aliases,landmarkFacilityIds:current.landmarkFacilityIds,
 primaryLandmarks:Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(m=>m.id)])),
 outsideDiagramId:"sapporo-grounds",landmarkPlaceholder:{inside:"例：北 / 南",outside:"例：北ゲート3 / 福住駅3番出口"},
 outsideViews:[
 {id:"grounds",label:"敷地・入場前",diagramId:"sapporo-grounds",floorLabel:"敷地・福住駅",venueLabel:{name:"プレミストドーム",point:[930,620]}},
 {id:"fukuzumi",label:"福住駅",diagramId:"sapporo-fukuzumi",floorLabel:"福住駅・場所一覧"},
 {id:"nearby",label:"周辺・預かり店舗",diagramId:"sapporo-nearby",floorLabel:"街の店舗・場所一覧"},
 {id:"sapporo",label:"札幌・さっぽろ駅",diagramId:"sapporo-sapporo",floorLabel:"JR・地下鉄を分けた場所一覧"}],
 coverage:{description:"各階の設備と敷地・駅・店舗を分けて探せます。公式図の区域を示す参考図です。個別位置が未確定の施設は場所一覧へ接続します。",sourceIds:["service","grounds","station-locker"]}
};
