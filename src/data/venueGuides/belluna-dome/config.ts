import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import seats from "./seats.json";
import current from "./current-facilities.json";
export const bellunaSeats = seats as StandMapData;
export const bellunaLevels = [{ id:"stand",label:"常設スタンド",color:"#b4d0ee",point:[595,770] }];
export const bellunaAreas = [{ id:"all",label:"全体" },...["1塁内野","3塁内野","ネット裏","1塁外野","3塁外野"].map(id=>({id,label:id}))];
export const bellunaFacilityConfig: FacilityConfig = {
 defaultFloor:"ドーム場内",floors:["ドーム場内","獅子ビル1F","獅子ビル2F","獅子ビル3F","センタービル1F","センタービル2F","センタービル3F","ラウンジ"],
 groups:current.groups as FacilityGroup[],meta:current.meta as Record<string,FacilityMeta>,aliases:current.aliases,landmarkFacilityIds:current.landmarkFacilityIds,
 primaryLandmarks:Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(m=>m.id)])),outsideDiagramId:"belluna-grounds",
 landmarkPlaceholder:{inside:"例：1塁側 / 獅子ビル",outside:"例：メインゲート / 西武球場前駅改札"},
 outsideViews:[{id:"grounds",label:"敷地・入場前",diagramId:"belluna-grounds",floorLabel:"敷地・駅・ゲート",venueLabel:{name:"ベルーナドーム",point:[513,245]}},{id:"nearest",label:"西武球場前駅",diagramId:"belluna-nearest",floorLabel:"改札内・場所一覧"},{id:"transfer",label:"西所沢・所沢駅",diagramId:"belluna-transfer",floorLabel:"乗換駅・場所一覧"},{id:"store",label:"予約預かり店舗",diagramId:"belluna-store",floorLabel:"所沢・場所一覧"}],
 coverage:{description:"場内・獅子ビル・センタービル・専用ラウンジを分けて探せます。図は公式掲載の区域を整理した参考図です。駅・店舗と入口未確定の設備は場所一覧にあります。",sourceIds:["stadium","grounds","faq"]}
};
