import geometry from "./tokyoDomeFacilityGeometry.json" with { type: "json" };

export type FacilityFloorId = "1f-infield" | "1f-outfield" | "2f-infield" | "3f-infield" | "4f-infield";
export type FacilityKind = "women" | "men" | "mixed" | "unisex" | "accessible" | "locker" | "baby" | "atm" | "stairs" | "information" | "wash" | "charge" | "ticket" | "food";
export type FacilityAnchor = {
  id: string; floorId: FacilityFloorId; kind: FacilityKind;
  source: "floors" | "shops"; x: number; y: number;
  sourceCurve?: number; shopNumber?: number;
  passages: readonly [number, number][];
  evidence: "diagram-point"; checkedAt: "2026-09-27";
};
export const FACILITY_FLOORS = [
  { id: "1f-infield", floor: "1F", label: "1F 内野", seat: "1階席側" },
  { id: "1f-outfield", floor: "外野", label: "1F 外野", seat: "外野席側" },
  { id: "2f-infield", floor: "2F", label: "2F 内野", seat: "1階席の入場階" },
  { id: "3f-infield", floor: "3F", label: "3F 内野", seat: "バルコニー席側" },
  { id: "4f-infield", floor: "4F", label: "4F 内野", seat: "2階席側" },
] as const;
export const FACILITY_GEOMETRY = geometry;

// Manually classified against the source legend, after independent symbol extraction.
// IDs already used in the visitor guide are retained. No geographic entrance claim.
type SymbolRow = readonly [number, string, FacilityKind, ...readonly [number, number][]];
const classified: Record<FacilityFloorId, readonly SymbolRow[]> = {
  "1f-outfield": [
    [331,"toilet-floor-outfield-49","women",[49,49]], [346,"toilet-floor-outfield-50-w","women",[50,50]],
    [336,"toilet-floor-outfield-50-m","men",[50,51]], [351,"toilet-floor-outfield-55","women",[55,55]],
    [341,"toilet-floor-outfield-57","men",[57,57]], [535,"locker-floor-outfield-left","locker",[53,53]],
    [539,"locker-floor-outfield-right","locker",[57,58]], [924,"baby-floor-outfield","baby",[55,55]],
    [476,"wash-map-1-476","wash",[51,51]], [464,"wash-map-1-464","wash",[56,56]],
    [497,"charge-map-1-497","charge",[54,54]],
  ],
  "1f-infield": [
    [316,"toilet-floor-1f-36-48","women",[36,48]], [321,"toilet-floor-1f-33-35","women",[33,35]],
    [297,"toilet-floor-1f-30-32","unisex",[30,32]], [372,"toilet-floor-1f-27-28","mixed",[27,29]],
    [306,"toilet-floor-1f-20-22-w","women",[20,22]], [307,"toilet-floor-1f-20-22-m","men",[20,22]],
    [488,"toilet-floor-1f-1-13","mixed",[1,13]], [326,"toilet-floor-1f-1-13-w","women",[1,13]],
    [531,"locker-floor-1f-left","locker",[36,48]], [407,"baby-floor-1f","baby",[17,19]],
    [395,"atm-inside","atm",[17,19]], [458,"toilet-map-1-458","accessible",[27,29]],
    [381,"stairs-floor-1f-14-16","stairs",[14,16]], [383,"stairs-floor-1f-17-19","stairs",[17,19]],
    [389,"stairs-floor-1f-23-24","stairs",[23,24]], [393,"stairs-map-1-393","stairs",[36,48]],
    [391,"stairs-map-1-391","stairs",[30,32]], [387,"stairs-map-1-387","stairs",[25,29]],
    [385,"stairs-map-1-385","stairs",[20,22]], [434,"wash-map-1-434","wash",[36,48]],
    [446,"wash-map-1-446","wash",[33,35]], [422,"wash-map-1-422","wash",[25,26]],
    [410,"wash-map-1-410","wash",[1,13]], [514,"charge-map-1-514","charge",[33,48]],
    [401,"ticket-map-1-401","ticket",[23,26]],
  ],
  "2f-infield": [
    [426,"toilet-floor-2f-34","men",[34,34]], [436,"toilet-floor-2f-27","women",[27,27]],
    [604,"toilet-floor-2f-23","mixed",[23,23]], [431,"toilet-floor-2f-15","women",[15,15]],
    [651,"locker-floor-2f-left","locker",[42,42]], [655,"locker-floor-2f-right","locker",[7,7]],
    [447,"toilet-map-2-447","accessible",[38,38]], [453,"toilet-map-2-453","accessible",[36,36]],
    [459,"toilet-map-2-459","accessible",[11,11]], [441,"toilet-map-2-441","accessible",[18,18]],
    [518,"stairs-floor-2f-13","stairs",[13,13]], [514,"stairs-floor-2f-31","stairs",[31,31]],
    [508,"stairs-floor-2f-24-25","stairs",[24,25]], [516,"stairs-map-2-516","stairs",[36,37]],
    [510,"stairs-map-2-510","stairs",[27,27]], [512,"stairs-map-2-512","stairs",[23,23]],
    [630,"stairs-map-2-630","stairs",[18,18]], [505,"information-map-2-505","information",[24,25]],
    [532,"wash-map-2-532","wash",[35,36]], [544,"wash-map-2-544","wash",[13,14]],
    [520,"wash-map-2-520","wash",[26,27]], [556,"wash-map-2-556","wash",[23,24]],
    [613,"charge-map-2-613","charge",[31,31]], [632,"charge-map-2-632","charge",[18,18]],
  ],
  "3f-infield": [
    [455,"toilet-floor-3f-33-near","mixed"], [464,"toilet-floor-3f-33-outer","mixed"],
    [437,"toilet-floor-3f-30-near","mixed"], [446,"toilet-floor-3f-30-outer","mixed"],
  ],
  "4f-infield": [
    [262,"toilet-floor-4f-14-w","women",[14,14]], [257,"toilet-floor-4f-14-outer","women",[14,14]],
    [267,"toilet-floor-4f-13","women",[13,13]], [237,"toilet-floor-4f-11","men",[11,11]],
    [252,"toilet-floor-4f-9","women",[9,9]], [232,"toilet-floor-4f-6","men",[6,6]],
    [247,"toilet-floor-4f-4","women",[4,4]], [277,"toilet-floor-4f-2","women",[2,2]],
    [272,"toilet-floor-4f-1","women",[1,1]], [242,"toilet-floor-4f-1-outer","men",[1,1]],
    [390,"locker-floor-4f-left","locker",[9,9]], [394,"locker-floor-4f-right","locker",[6,6]],
    [353,"baby-floor-4f","baby",[8,8]], [282,"toilet-map-3-282","accessible",[9,9]],
    [341,"wash-map-3-341","wash",[12,12]], [329,"wash-map-3-329","wash",[3,3]],
    [305,"wash-map-3-305","wash",[8,9]], [317,"wash-map-3-317","wash",[6,7]],
    [356,"charge-map-3-356","charge",[11,11]], [373,"charge-map-3-373","charge",[4,4]],
  ],
};
const gateRows: Record<FacilityFloorId, readonly (readonly [number, number])[]> = {
  "1f-infield": [], "1f-outfield": [[364,11],[356,25]],
  "2f-infield": [[473,24],[489,23],[497,22],[481,21],[425,20]],
  "3f-infield": [[429,33],[420,30]], "4f-infield": [[297,41],[288,40]],
};
export const FACILITY_ANCHORS: readonly FacilityAnchor[] = Object.entries(classified).flatMap(([floorId, rows]) => {
  const source=geometry.floors.find((f)=>f.id===floorId)!;
  return rows.map(([curve,id,kind,...passages])=>{
    const symbol=source.symbols.find((s)=>s.curve===curve);
    if(!symbol) throw new Error(`Missing reviewed source symbol ${floorId}/${curve}`);
    return {id,floorId:floorId as FacilityFloorId,kind,source:"floors" as const,x:symbol.x,y:symbol.y,sourceCurve:curve,passages,evidence:"diagram-point" as const,checkedAt:"2026-09-27" as const};
  });
});
export const FACILITY_GATES = Object.entries(gateRows).flatMap(([floorId,rows])=>rows.map(([curve,number])=>{
  const symbol=geometry.floors.find((f)=>f.id===floorId)!.symbols.find((s)=>s.curve===curve)!;
  return {floorId:floorId as FacilityFloorId,number,x:symbol.x,y:symbol.y,sourceCurve:curve};
}));
// Printed passage labels: manually located in the source diagram, not angular divisions.
export const FACILITY_PASSAGE_LABELS: Partial<Record<FacilityFloorId,readonly (readonly [string,number,number])[]>> = {
  "1f-infield":[["36–48",150,519],["33–35",173,560],["30–32",210,586],["27–29",231,617],["25–26",273,638],["23–24",307,638],["20–22",354,617],["17–19",384,585],["14–16",422,559],["1–13",442,519]],
  "1f-outfield":[["49",117,316],["50",148,282],["51",173,261],["52",218,234],["53",235,221],["54",350,218],["55",366,233],["56",405,261],["57",431,288],["58",467,315]],
  "2f-infield":[["48",124,281],["42",113,350],["38",135,416],["34",172,477],["31",204,505],["27",247,538],["24–25",291,554],["23",334,542],["18",405,505],["13",451,427],["7",476,354],["1",462,281]],
  "4f-infield":[["14",115,507],["13",143,540],["12",155,566],["11",172,585],["10",199,615],["9",228,635],["8",270,659],["7",325,659],["6",369,635],["5",396,615],["4",423,585],["3",440,566],["2",452,540],["1",479,507]],
};

// Shop-number centres manually read from the independent 1178 x 1460 shop diagram.
// They must NOT be transformed onto the differently schematised equipment PDF.
// Both original diagrams are available within the same floor; source coordinates
// and factual order are preserved, rather than promising an unverified overlay.
const shops: readonly (readonly [number,string,number,number])[] = [
  [1,"route66-1f",39,172],[2,"tanaka",67,184],[3,"sanchaya",60,213],[4,"futago",94,205],
  [5,"yoshiko",82,240],[6,"pizzala-1f-3b",131,244],[7,"tetsuichi-1f-3b",127,275],[8,"hanmibijin",157,265],
  [9,"toritake",150,306],[10,"rikyu-1f-3b",197,285],[11,"shop104",217,330],[12,"shop105",352,328],
  [13,"labo-teria-piece",395,324],[14,"grazy-potato",392,276],[15,"rookie-curry",426,289],[16,"tsukada-farm-stand",421,263],
  [17,"bontabonta",458,280],[18,"potamelt",454,253],[19,"rrainbow",489,236],[20,"kyoto-katsugyu",484,203],
  [21,"nick-stock",515,212],[22,"shop106",505,180],[23,"sapporo-kanikobo",533,187],[24,"marion-1f",536,156],
  [25,"gourmet-ai",77,129],[26,"crispys-burger",103,149],[27,"shop109",305,277],[28,"31-1f",471,159],[29,"shishiro",489,134],
  [30,"shop201",65,508],[31,"shop202",129,640],[32,"shop203",149,666],[33,"shop204",188,708],
  [34,"suntory-stadium-bar",214,727],[35,"tokyo-potato",226,750],[36,"shop207",401,732],[37,"shop208",429,714],
  [38,"shop209",485,657],[39,"shop210",501,634],[40,"now8",562,508],
  [41,"marion-4f",50,794],[42,"zeal-house",34,822],[43,"shop402",103,912],[44,"shop403",214,1013],
  [45,"shop404",248,1041],[46,"gindako-4f",276,1050],[47,"kakiya-donmatsu",332,1067],[48,"smashed-burger-tokyo",344,1041],
  [49,"pizzala-4f",370,1053],[50,"tetsuichi-4f",380,1030],[51,"shop406",434,1005],[52,"shop407",519,917],
  [53,"oyaji-highball",579,822],[54,"waoyatsu",565,794],[55,"kyubei",126,878],[56,"rikyu-4f",151,910],
  [57,"momosushi",169,936],[58,"shop409",196,965],[59,"shop410",424,962],[60,"31-4f",463,932],[61,"shop412",495,888],
  [62,"shop-of8-burger",114,1280],[63,"shop-of7",194,1210],[64,"taiheichan",466,1265],[65,"thunder-burger",489,1275],
  [66,"topos",501,1297],[67,"shop-of8-rice",88,1253],[68,"shop-of6",434,1168],[69,"gindako-outfield",473,1200],
];
export const SHOP_ANCHORS: readonly FacilityAnchor[] = shops.map(([shopNumber,id,x,y])=>({
  id,floorId:shopNumber<30?"1f-infield":shopNumber<41?"2f-infield":shopNumber<62?"4f-infield":"1f-outfield",
  kind:"food",source:"shops",x,y,shopNumber,passages:[],evidence:"diagram-point",checkedAt:"2026-09-27",
}));
export const SHOP_DIAGRAMS: Partial<Record<FacilityFloorId,{crop:readonly number[];paths:readonly string[]}>> = {
  "1f-infield":{crop:[5,35,600,335],paths:[
    "M18 107 L65 80 L92 130 L77 169 Z", "M81 130 L194 224 L183 254 L67 163 Z",
    "M196 230 L252 258 L247 286 L192 266 Z", "M260 261 Q285 271 316 260 L316 289 Q286 300 259 289 Z",
    "M323 259 L367 240 L381 270 L328 287 Z", "M376 232 L422 192 L444 213 L393 255 Z",
    "M433 181 L536 40 L604 79 L572 141 L547 135 L570 88 L552 70 L462 201 Z",
    "M33 154 L67 135 Q137 272 214 310 Q284 338 355 310 L371 339 Q287 368 203 341 Q109 300 33 154 Z",
    "M365 311 Q479 250 547 135 L572 141 Q512 279 382 339 Z",
  ]},
  "2f-infield":{crop:[35,415,565,395],paths:[
    "M55 497 L78 493 L84 548 L61 554 Z", "M543 494 L573 493 L566 554 L546 548 Z",
    "M79 577 L104 577 Q126 630 154 656 L135 682 Q98 647 79 577 Z",
    "M168 688 Q210 725 255 738 L244 773 Q196 758 168 724 Z",
    "M279 749 Q310 760 340 749 L341 782 Q311 792 277 780 Z",
    "M348 738 Q405 719 446 688 L466 722 Q423 759 359 774 Z",
    "M467 657 Q500 626 526 577 L549 577 Q537 638 490 683 Z",
  ]},
  "4f-infield":{crop:[15,775,585,315],paths:[
    "M27 798 L60 785 Q126 960 274 1005 L266 1030 Q112 986 27 798 Z",
    "M283 1009 Q310 1016 337 1009 L342 1030 Q310 1041 278 1030 Z",
    "M343 1005 Q494 965 558 785 L592 798 Q508 984 350 1030 Z",
    "M192 994 L216 979 L259 1032 L233 1045 Z", "M412 982 L439 994 L399 1044 L373 1032 Z",
  ]},
  "1f-outfield":{crop:[30,1090,560,290],paths:[
    "M66 1302 Q174 1166 277 1161 Q353 1155 423 1197 L407 1222 Q346 1181 277 1188 Q180 1195 88 1322 Z",
    "M413 1193 L429 1165 L513 1211 L495 1243 Z", "M434 1226 L579 1339 L577 1370 L415 1252 Z",
    "M341 1150 L364 1090 L391 1100 L410 1128 L387 1176 Z",
  ]},
};
export const SHOP_GATES:Partial<Record<FacilityFloorId,readonly (readonly [number,number,number])[]>>={
  "2f-infield":[[24,59,575],[23,139,726],[22,313,796],[21,487,726],[20,568,575]],
  "4f-infield":[[41,131,991],[40,492,991]],"1f-outfield":[[11,44,1288],[25,487,1156]],
};
export const SHOP_PASSAGE_LABELS:Partial<Record<FacilityFloorId,readonly (readonly [string,number,number])[]>>={
  "1f-infield":[["36–48",110,104],["33–35",134,153],["30–32",169,194],["27–29",214,231],["25–26",267,254],["23–24",305,254],["20–22",356,230],["17–19",402,194],["14–16",440,153],["1–13",460,101]],
  "2f-infield":[["42",103,526],["38",119,594],["34",164,653],["31",193,692],["27",247,724],["24–25",294,742],["23",361,722],["18",440,692],["13",506,608],["7",531,532]],
  "4f-infield":[["14",58,813],["13",82,845],["12",101,876],["11",127,902],["10",154,927],["9",191,962],["8",273,988],["7",350,988],["6",405,981],["5",451,953],["4",482,922],["3",515,883],["2",538,853],["1",562,813]],
  "1f-outfield":[["49",98,1279],["50",138,1246],["51",169,1213],["52",217,1186],["53",240,1174],["54",374,1175],["55",398,1186],["56",442,1213],["57",483,1246],["58",518,1283]],
};
export function facilityFloorId(floor:string):FacilityFloorId|undefined { return FACILITY_FLOORS.find((f)=>f.floor===floor)?.id; }
export function getFacilityAnchor(id:string) { return FACILITY_ANCHORS.find((a)=>a.id===id) ?? SHOP_ANCHORS.find((a)=>a.id===id); }
export function matchesFacilityPassage(id:string,passage:number) { return getFacilityAnchor(id)?.passages.some(([start,end])=>start<=passage&&passage<=end) ?? false; }
export const FACILITY_KIND_NAMES: Record<FacilityKind,string> = {women:"女性トイレ",men:"男性トイレ",mixed:"男女トイレ",unisex:"男女共用トイレ",accessible:"バリアフリートイレ",locker:"ロッカー",baby:"ベビールーム",atm:"ATM",stairs:"階段",information:"インフォメーション",wash:"手洗い場",charge:"チャージ機",ticket:"券売機",food:"売店"};
export const ADDITIONAL_FACILITY_SPOTS = FACILITY_ANCHORS.filter((a)=>a.id.includes("-map-")).map((a)=>({
  id:a.id,name:FACILITY_KIND_NAMES[a.kind],category:"facility" as const,area:"inside" as const,
  floor:FACILITY_FLOORS.find((f)=>f.id===a.floorId)!.floor,
  location:`${FACILITY_FLOORS.find((f)=>f.id===a.floorId)!.label}・${a.passages.map(([s,e])=>s===e?`${s}通路付近`:`${s}〜${e}通路側`).join(" / ")}`,
  description:"公式フロア図に掲載された設備。公演時の利用・通行は場内案内に従ってください。",
  sources:["floors"] as const,mapAccuracy:"named-point" as const,checkedAt:"2026-09-27",
}));
