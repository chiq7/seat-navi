import { getEventArenaPhotoLayout, type EventArenaPhotoLayout } from "@/lib/eventArenaPhotos";

type Archive = {
  id: string;
  title: string;
  kind: "standing" | "seated";
  layout: EventArenaPhotoLayout;
};

export function getVenueArenaPhotoArchives(venueId: string): Archive[] {
  return (venueArenaPhotoArchives[venueId] ?? []).flatMap(archive => {
    const layout = getEventArenaPhotoLayout(
      { id: archive.id, date: archive.layout.date, venue_id: venueId },
      { [archive.id]: archive.layout },
    );
    return layout ? [{ ...archive, layout }] : [];
  });
}

const rectangle = (left: number, top: number, right: number, bottom: number) =>
  [[left, top], [right, top], [right, bottom], [left, bottom]] as const;

const hiStandardBlocks = [
  { id: "N", points: rectangle(67, 158, 319, 207) },
  { id: "K", points: rectangle(319, 158, 572, 207) },
  { id: "W", points: rectangle(67, 220, 319, 269) },
  { id: "B", points: rectangle(319, 220, 572, 269) },
  { id: "H", points: rectangle(67, 283, 319, 332) },
  { id: "P", points: rectangle(319, 283, 572, 332) },
  { id: "S", points: rectangle(67, 346, 319, 395) },
  { id: "J", points: rectangle(319, 346, 572, 395) },
  { id: "V", points: rectangle(85, 409, 230, 467) },
  { id: "Q", points: rectangle(409, 409, 554, 467) },
  { id: "Z", points: rectangle(67, 479, 319, 534) },
  { id: "A", points: rectangle(319, 479, 572, 534) },
  { id: "C", points: rectangle(67, 547, 319, 609) },
  { id: "F", points: rectangle(319, 547, 572, 609) },
  { id: "U", points: rectangle(67, 625, 319, 677) },
  { id: "Y", points: rectangle(319, 625, 572, 677) },
  { id: "E", points: rectangle(67, 691, 319, 744) },
  { id: "G", points: rectangle(319, 691, 572, 744) },
  { id: "指定席", points: rectangle(48, 774, 590, 857) },
];

// Both FUSION diagrams show this same arrangement. Orient their stage at the top.
const fusionBlocks = [
  ...[1, 2, 3, 5, 6, 7].map(number => {
    const left = 86 + (number - 1) * 58;
    return { id: `A${number}`, points: rectangle(left, 120, left + 46, 232) };
  }),
  ...["B", "C", "D"].flatMap((prefix, row) => Array.from({ length: 7 }, (_, index) => {
    const left = 86 + index * 58;
    const top = 258 + row * 132;
    const bottom = prefix === "D" && index === 3 ? top + 76 : top + 108;
    return { id: `${prefix}${index + 1}`, points: rectangle(left, top, left + 46, bottom) };
  })),
  ...Array.from({ length: 9 }, (_, index) => {
    const left = 54 + index * 53;
    return { id: `E${index + 1}`, points: rectangle(left, 658, left + 42, 751) };
  }),
];


// SUPER BEAVER at ZOZO Marine (2025-06-20/21): the venue board shows the stage along the outfield side
// with columns A (nearest) to F and numbers 1-17; row 9 of A-C is the runway. Stage turned to the top here.
const superBeaverZozoRows: Record<string, number[]> = {
  A: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17],
  B: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17],
  C: [3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15],
  D: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  E: [6, 7, 8, 9, 10, 11, 12],
  F: [6, 7, 8, 9, 10, 11, 12],
};
const superBeaverZozoBlocks = Object.entries(superBeaverZozoRows).flatMap(([letter, numbers], band) =>
  numbers.map(number => {
    const left = 20 + (number - 1) * 34, top = 80 + band * 45;
    return { id: `${letter}${number}`, points: rectangle(left, top, left + 30, top + 38) };
  }));

// ONE OK ROCK DETOX JAPAN TOUR FINAL at ZOZO Marine (2026-09-05/06): eight standing blocks.
const oneOkRockZozoBlocks = [
  { id: "A1", points: rectangle(30, 80, 140, 140) }, { id: "A2", points: rectangle(150, 80, 270, 140) }, { id: "A3", points: rectangle(280, 80, 390, 140) },
  { id: "B1", points: rectangle(60, 150, 160, 205) }, { id: "B2", points: rectangle(170, 150, 260, 205) }, { id: "B3", points: rectangle(270, 150, 360, 205) },
  { id: "C1", points: rectangle(110, 215, 205, 290) }, { id: "C2", points: rectangle(215, 215, 310, 290) },
];

// ONE OK ROCK DETOX JAPAN TOUR 2025 at Nissan Stadium (2025-08-30/31): columns A (nearest the stage)
// to J (no I), numbers 1-17. Stage turned to the top here.
const oneOkRockNissanRows: Record<string, number[]> = {
  A: Array.from({ length: 17 }, (_, i) => i + 1), B: Array.from({ length: 17 }, (_, i) => i + 1),
  C: Array.from({ length: 17 }, (_, i) => i + 1), D: Array.from({ length: 16 }, (_, i) => i + 1),
  E: Array.from({ length: 17 }, (_, i) => i + 1), F: Array.from({ length: 15 }, (_, i) => i + 2),
  G: Array.from({ length: 17 }, (_, i) => i + 1), H: Array.from({ length: 17 }, (_, i) => i + 1),
  J: [2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16],
};
const oneOkRockNissanBlocks = Object.entries(oneOkRockNissanRows).flatMap(([letter, numbers], band) =>
  numbers.map(number => {
    const left = 20 + (number - 1) * 33, top = 70 + band * 36;
    return { id: `${letter}${number}`, points: rectangle(left, top, left + 29, top + 30) };
  }));

const xPhoto = (block: string, user: string, id: string, photo: number, extra: { row?: string; positionLabel?: string } = {}) => {
  const url = `https://x.com/${user}/status/${id}`;
  return { block, url, photo, source: url, ...extra };
};

export const venueArenaPhotoArchives: Partial<Record<string, readonly Archive[]>> = {
  "zozo-marine": [
    {
      id: "super-beaver-2025-06-20",
      title: "SUPER BEAVER ZOZOマリンスタジアム公演",
      kind: "seated",
      layout: {
        date: "2025-06-20",
        venueId: "zozo-marine",
        layoutSource: "https://x.com/i/web/status/1935968518572589356/photo/1",
        viewBox: [0, 0, 620, 360],
        stage: rectangle(71, 20, 560, 62),
        subStage: rectangle(292, 62, 322, 208),
        blocks: superBeaverZozoBlocks,
        photos: [
          xPhoto("A6", "waraukadonihasa", "1937603327170347075", 1, { row: "7" }),
          xPhoto("A3", "ayami530SPBV", "1936938214067220693", 1, { row: "2", positionLabel: "番号は写真から推定" }),
          xPhoto("E9", "super_superyu", "1936351650723266906", 1, { positionLabel: "番号は写真から推定" }),
          xPhoto("D6", "tomo_luke_", "1935979423540597036", 1),
        ],
      },
    },
    {
      id: "one-ok-rock-2026-09-05",
      title: "ONE OK ROCK DETOX JAPAN TOUR FINAL 2026",
      kind: "standing",
      layout: {
        date: "2026-09-05",
        venueId: "zozo-marine",
        layoutSource: "https://x.com/i/web/status/2096004241207013647/photo/1",
        viewBox: [0, 0, 420, 310],
        stage: rectangle(110, 20, 310, 60),
        blocks: oneOkRockZozoBlocks,
        photos: [xPhoto("B2", "rs10969_", "2096155722740552129", 1, { positionLabel: "スタンディング" })],
      },
    },
    {"id": "kcon-japan-2024-05-11", "title": "KCON JAPAN 2024 M COUNTDOWN STAGE", "kind": "seated", "layout": {"date": "2024-05-11", "venueId": "zozo-marine", "layoutSource": "https://x.com/i/web/status/1789191895023063537/photo/1", "viewBox": [30, 296, 1060, 1394], "stage": [[174, 616], [206, 616], [256, 1464], [226, 1464], [214, 1278], [74, 1278], [38, 848], [186, 848]], "blocks": [{"id": "1〜20列 213〜220番", "points": [[387, 308], [467, 308], [467, 349], [387, 349]], "approximate": true}, {"id": "21〜40列 213〜220番", "points": [[489, 326], [512, 326], [512, 349], [489, 349]], "approximate": true}, {"id": "1〜20列 201〜212番", "points": [[280, 371], [470, 371], [470, 433], [280, 433]], "approximate": true}, {"id": "21〜40列 201〜212番", "points": [[491, 374], [589, 374], [589, 434], [491, 434]], "approximate": true}, {"id": "1〜20列 189〜200番", "points": [[269, 455], [472, 455], [472, 515], [269, 515]]}, {"id": "21〜40列 189〜200番", "points": [[493, 458], [663, 458], [663, 515], [493, 515]], "approximate": true}, {"id": "1〜20列 177〜188番", "points": [[274, 538], [476, 538], [476, 596], [274, 596]]}, {"id": "21〜40列 177〜188番", "points": [[495, 539], [687, 539], [687, 595], [495, 595]]}, {"id": "41〜52列 177〜181番", "points": [[735, 568], [778, 568], [778, 594], [735, 594]], "approximate": true}, {"id": "1〜20列 165〜176番", "points": [[278, 619], [478, 619], [478, 676], [278, 676]]}, {"id": "21〜40列 165〜176番", "points": [[498, 618], [688, 618], [688, 673], [498, 673]]}, {"id": "41〜52列 165〜176番", "points": [[735, 617], [854, 617], [854, 671], [735, 671]], "approximate": true}, {"id": "1〜20列 153〜164番", "points": [[280, 698], [480, 698], [480, 755], [280, 755]]}, {"id": "21〜40列 153〜164番", "points": [[500, 695], [688, 695], [688, 751], [500, 751]]}, {"id": "41〜52列 153〜164番", "points": [[735, 692], [832, 692], [832, 746], [735, 746]], "approximate": true}, {"id": "69〜77列 153〜164番", "points": [[1008, 689], [1069, 689], [1069, 741], [1008, 741]], "approximate": true}, {"id": "1〜20列 141〜152番", "points": [[287, 803], [483, 803], [483, 861], [287, 861]]}, {"id": "21〜40列 141〜152番", "points": [[504, 799], [688, 799], [688, 855], [504, 855]]}, {"id": "41〜60列 141〜152番", "points": [[736, 791], [916, 791], [916, 848], [736, 848]]}, {"id": "61〜77列 141〜152番", "points": [[933, 788], [1071, 788], [1071, 842], [933, 842]]}, {"id": "1〜20列 129〜140番", "points": [[351, 878], [485, 878], [485, 935], [351, 935]]}, {"id": "21〜40列 129〜140番", "points": [[506, 872], [689, 872], [689, 930], [506, 930]]}, {"id": "41〜60列 129〜140番", "points": [[736, 863], [915, 863], [915, 921], [736, 921]]}, {"id": "61〜77列 129〜140番", "points": [[932, 860], [1068, 860], [1068, 914], [932, 914]]}, {"id": "1〜20列 117〜128番", "points": [[296, 952], [488, 952], [488, 1011], [296, 1011]]}, {"id": "21〜40列 117〜128番", "points": [[507, 945], [690, 945], [690, 1002], [507, 1002]]}, {"id": "41〜60列 117〜128番", "points": [[735, 936], [913, 936], [913, 992], [735, 992]]}, {"id": "61〜77列 117〜128番", "points": [[931, 930], [1065, 930], [1065, 984], [931, 984]]}, {"id": "1〜20列 105〜116番", "points": [[300, 1025], [490, 1025], [490, 1083], [300, 1083]]}, {"id": "21〜40列 105〜116番", "points": [[509, 1016], [689, 1016], [689, 1072], [509, 1072]]}, {"id": "41〜60列 105〜116番", "points": [[735, 1006], [911, 1006], [911, 1061], [735, 1061]]}, {"id": "61〜77列 105〜116番", "points": [[929, 1000], [1062, 1000], [1062, 1052], [929, 1052]]}, {"id": "1〜20列 93〜104番", "points": [[304, 1095], [493, 1095], [493, 1154], [304, 1154]]}, {"id": "21〜40列 93〜104番", "points": [[511, 1085], [690, 1085], [690, 1143], [511, 1143]]}, {"id": "41〜60列 93〜104番", "points": [[736, 1074], [910, 1074], [910, 1130], [736, 1130]]}, {"id": "61〜77列 93〜104番", "points": [[928, 1067], [1059, 1067], [1059, 1120], [928, 1120]]}, {"id": "1〜20列 81〜92番", "points": [[367, 1165], [494, 1165], [494, 1221], [367, 1221]]}, {"id": "21〜40列 81〜92番", "points": [[514, 1154], [690, 1154], [690, 1212], [514, 1212]]}, {"id": "41〜60列 81〜92番", "points": [[736, 1142], [907, 1142], [907, 1197], [736, 1197]]}, {"id": "61〜77列 81〜92番", "points": [[927, 1133], [1056, 1133], [1056, 1186], [927, 1186]]}, {"id": "1〜20列 69〜80番", "points": [[312, 1235], [495, 1235], [495, 1294], [312, 1294]]}, {"id": "21〜40列 69〜80番", "points": [[516, 1222], [690, 1222], [690, 1279], [516, 1279]]}, {"id": "41〜60列 69〜80番", "points": [[737, 1209], [906, 1209], [906, 1264], [737, 1264]]}, {"id": "61〜77列 69〜80番", "points": [[925, 1199], [1054, 1199], [1054, 1252], [925, 1252]]}, {"id": "1〜20列 57〜68番", "points": [[317, 1327], [498, 1327], [498, 1386], [317, 1386]]}, {"id": "21〜40列 57〜68番", "points": [[518, 1314], [691, 1314], [691, 1370], [518, 1370]]}, {"id": "41〜52列 57〜68番", "points": [[737, 1304], [826, 1304], [826, 1353], [737, 1353]], "approximate": true}, {"id": "61〜77列 57〜68番", "points": [[925, 1288], [1044, 1288], [1044, 1337], [925, 1337]], "approximate": true}, {"id": "1〜20列 45〜56番", "points": [[321, 1393], [500, 1393], [500, 1452], [321, 1452]]}, {"id": "21〜40列 45〜56番", "points": [[520, 1378], [691, 1378], [691, 1435], [520, 1435]]}, {"id": "41〜52列 45〜56番", "points": [[737, 1369], [839, 1369], [839, 1416], [737, 1416]], "approximate": true}, {"id": "1〜20列 33〜44番", "points": [[325, 1458], [502, 1458], [502, 1517], [325, 1517]]}, {"id": "21〜40列 33〜44番", "points": [[522, 1442], [691, 1442], [691, 1500], [522, 1500]], "approximate": true}, {"id": "1〜20列 21〜32番", "points": [[329, 1522], [504, 1522], [504, 1581], [329, 1581]], "approximate": true}, {"id": "21〜40列 21〜32番", "points": [[524, 1507], [670, 1507], [670, 1563], [524, 1563]], "approximate": true}, {"id": "1〜20列 9〜20番", "points": [[348, 1586], [505, 1586], [505, 1637], [348, 1637]], "approximate": true}, {"id": "21〜40列 9〜20番", "points": [[525, 1576], [604, 1576], [604, 1625], [525, 1625]], "approximate": true}, {"id": "1〜20列 1〜8番", "points": [[444, 1649], [506, 1649], [506, 1674], [444, 1674]], "approximate": true}], "photos": [{"block": "1〜20列 105〜116番", "url": "https://x.com/LEE1020DOOR/status/1826631797767372844", "photo": 1, "source": "https://x.com/LEE1020DOOR/status/1826631797767372844", "row": "11"}, {"block": "21〜40列 93〜104番", "url": "https://x.com/sibasan_kp/status/1789192067857465624", "photo": 1, "source": "https://x.com/sibasan_kp/status/1789192067857465624", "positionLabel": "番号は写真から推定"}]}},
  ],
  "nissan-stadium": [
    {
      id: "one-ok-rock-2025-08-30",
      title: "ONE OK ROCK『DETOX JAPAN TOUR 2025』",
      kind: "seated",
      layout: {
        date: "2025-08-30",
        venueId: "nissan-stadium",
        layoutSource: "https://x.com/i/web/status/1962014315936112647/photo/1",
        viewBox: [0, 0, 600, 400],
        stage: rectangle(40, 20, 560, 55),
        blocks: oneOkRockNissanBlocks,
        photos: [xPhoto("E9", "_hii_mr_", "1961764049785655680", 1, { positionLabel: "番号は写真から推定" })],
      },
    },
  ],
  "toki-messe": [
    {
      id: "hi-standard-2026-01-12",
      title: "Hi-STANDARD「Screaming Newborn Baby Tour」",
      kind: "standing",
      layout: {
        date: "2026-01-12",
        venueId: "toki-messe",
        layoutSource: "https://x.com/SNB_Tour/status/2010582709870141454/photo/1",
        viewBox: [32, 96, 574, 776],
        stage: rectangle(139, 109, 500, 138),
        blocks: hiStandardBlocks,
        photos: ([
          ["B", "2010712661835780319", 1],
          ["B", "2010717471716872341", 1],
          ["P", "2012561302258888872", 1],
          ["K", "2010691455229329744", 3],
          ["N", "2010698097505284190", 2],
          ["G", "2010676543127966149", 1],
          ["S", "2010680617068114249", 1],
          ["B", "2010679604868952283", 1],
          ["N", "2010630359340450078", 1],
          ["N", "2010882076023931172", 1],
          ["K", "2010925064397734005", 1],
          ["H", "2011028387637445121", 1],
          ["P", "2010688740969402475", 1],
          ["P", "2010633928412184638", 1],
        ] as const).map(([block, postId, photo]) => {
          const url = `https://x.com/i/web/status/${postId}`;
          return { block, url, photo, source: url, positionLabel: "スタンディング" };
        }),
      },
    },
    {
      id: "vaundy-2024-12-01",
      title: "Vaundy「FUSION」",
      kind: "seated",
      layout: {
        date: "2024-12-01",
        venueId: "toki-messe",
        layoutSource: "https://x.com/i/web/status/1863162423819313485/photo/1",
        viewBox: [32, 34, 510, 734],
        stage: rectangle(112, 50, 455, 96),
        subStage: rectangle(256, 96, 310, 232),
        blocks: fusionBlocks,
        photos: [{
          block: "B7",
          url: "https://x.com/i/web/status/1863162423819313485",
          photo: 2,
          source: "https://x.com/i/web/status/1863162423819313485",
        }],
      },
    },
    {
      id: "vaundy-2024-11-30",
      title: "Vaundy「FUSION」",
      kind: "seated",
      layout: {
        date: "2024-11-30",
        venueId: "toki-messe",
        layoutSource: "https://x.com/i/web/status/1862872642149388316/photo/3",
        viewBox: [32, 34, 510, 734],
        stage: rectangle(112, 50, 455, 96),
        subStage: rectangle(256, 96, 310, 232),
        blocks: fusionBlocks,
        photos: [{
          block: "A3",
          row: "7",
          url: "https://x.com/i/web/status/1862872642149388316",
          photo: 2,
          source: "https://x.com/i/web/status/1862872642149388316",
        }],
      },
    },
  ],
  "ariake-arena": [
    {"id": "beat-ax-vol5-2025-02-01", "title": "BEAT AX vol.5（NAYEON／NEXZ出演）", "kind": "seated", "layout": {"date": "2025-02-01", "venueId": "ariake-arena", "layoutSource": "https://x.com/i/web/status/1885701157877915767/photo/1", "viewBox": [225, 230, 400, 500], "stage": [[232, 240], [617, 240], [617, 350], [232, 350]], "blocks": [{"id": "A1", "points": [[235, 390], [262, 390], [262, 485], [235, 485]]}, {"id": "A2", "points": [[265, 390], [307, 390], [307, 485], [265, 485]]}, {"id": "A3", "points": [[315, 391], [367, 391], [367, 487], [315, 487]]}, {"id": "A4", "points": [[375, 392], [430, 392], [430, 488], [375, 488]]}, {"id": "A5", "points": [[439, 393], [499, 393], [499, 490], [439, 490]]}, {"id": "A6", "points": [[506, 394], [564, 394], [564, 492], [506, 492]]}, {"id": "A7", "points": [[576, 395], [614, 395], [614, 494], [576, 494]]}, {"id": "B1", "points": [[235, 486], [264, 486], [264, 565], [235, 565]]}, {"id": "B2", "points": [[267, 487], [310, 487], [310, 567], [267, 567]]}, {"id": "B3", "points": [[316, 489], [369, 489], [369, 572], [316, 572]]}, {"id": "B4", "points": [[375, 491], [430, 491], [430, 577], [375, 577]]}, {"id": "B5", "points": [[437, 493], [497, 493], [497, 582], [437, 582]]}, {"id": "B6", "points": [[502, 497], [561, 497], [561, 590], [502, 590]]}, {"id": "B7", "points": [[569, 500], [606, 500], [606, 595], [569, 595]]}, {"id": "C1", "points": [[237, 568], [264, 568], [264, 620], [237, 620]]}, {"id": "C2", "points": [[270, 571], [309, 571], [309, 627], [270, 627]]}, {"id": "C3", "points": [[317, 576], [367, 576], [367, 635], [317, 635]]}, {"id": "C4", "points": [[374, 583], [427, 583], [427, 640], [374, 640]]}, {"id": "C5", "points": [[436, 591], [492, 591], [492, 652], [436, 652]]}, {"id": "C6", "points": [[502, 598], [556, 598], [556, 660], [502, 660]]}, {"id": "C7", "points": [[567, 603], [600, 603], [600, 667], [567, 667]]}, {"id": "D1", "points": [[240, 628], [267, 628], [267, 660], [240, 660]]}, {"id": "D2", "points": [[272, 633], [310, 633], [310, 667], [272, 667]]}, {"id": "D6", "points": [[500, 666], [552, 666], [552, 705], [500, 705]]}, {"id": "D7", "points": [[564, 673], [600, 673], [600, 715], [564, 715]]}], "photos": [{"block": "A5", "url": "https://x.com/battenarao/status/1885701157877915767", "photo": 2, "source": "https://x.com/battenarao/status/1885701157877915767", "row": "12"}]}},
  ],
  "hiroshima-arena": [
    {"id": "the-rampage-2024-05-18", "title": "THE RAMPAGE LIVE TOUR 2024 \"CyberHelix\" RX-16", "kind": "seated", "layout": {"date": "2024-05-18", "venueId": "hiroshima-arena", "layoutSource": "https://x.com/i/web/status/1799426109312045467/photo/2", "viewBox": [240, 180, 845, 565], "stage": [[847, 187], [1072, 187], [1072, 724], [861, 724], [861, 680], [967, 680], [967, 228], [847, 228]], "blocks": [{"id": "W-1", "points": [[751, 203], [824, 203], [824, 253], [751, 253]]}, {"id": "W-2", "points": [[751, 272], [902, 272], [902, 333], [751, 333]]}, {"id": "W-3", "points": [[751, 351], [906, 351], [906, 413], [751, 413]]}, {"id": "W-4", "points": [[756, 429], [909, 429], [909, 493], [756, 493]]}, {"id": "W-5", "points": [[758, 507], [911, 507], [911, 570], [758, 570]]}, {"id": "W-6", "points": [[760, 587], [913, 587], [913, 648], [760, 648]]}, {"id": "W-7", "points": [[762, 667], [839, 667], [839, 717], [762, 717]]}, {"id": "X-1", "points": [[556, 207], [707, 207], [707, 258], [556, 258]]}, {"id": "X-2", "points": [[558, 278], [709, 278], [709, 340], [558, 340]]}, {"id": "X-3", "points": [[561, 358], [711, 358], [711, 420], [561, 420]]}, {"id": "X-4", "points": [[564, 439], [713, 439], [713, 500], [564, 500]]}, {"id": "X-5", "points": [[567, 514], [717, 514], [717, 578], [567, 578]]}, {"id": "X-6", "points": [[569, 594], [720, 594], [720, 658], [569, 658]]}, {"id": "X-7", "points": [[572, 672], [722, 672], [722, 728], [572, 728]]}, {"id": "Y-1", "points": [[389, 207], [518, 207], [518, 258], [389, 258]]}, {"id": "Y-2", "points": [[394, 280], [522, 280], [522, 340], [394, 340]]}, {"id": "Y-3", "points": [[398, 362], [524, 362], [524, 422], [398, 422]]}, {"id": "Y-4", "points": [[400, 441], [528, 441], [528, 502], [400, 502]]}, {"id": "Y-5", "points": [[402, 520], [531, 520], [531, 583], [402, 583]]}, {"id": "Y-6", "points": [[407, 603], [533, 603], [533, 667], [407, 667]]}, {"id": "Y-7", "points": [[411, 680], [536, 680], [536, 733], [411, 733]]}, {"id": "Z-2", "points": [[252, 291], [358, 291], [358, 347], [252, 347]]}, {"id": "Z-3", "points": [[258, 364], [361, 364], [361, 428], [258, 428]]}, {"id": "Z-5", "points": [[264, 529], [367, 529], [367, 592], [264, 592]]}, {"id": "Z-6", "points": [[267, 608], [370, 608], [370, 674], [267, 674]]}], "photos": [{"block": "X-5", "url": "https://x.com/_kirbystar_/status/1799426109312045467", "photo": 1, "source": "https://x.com/_kirbystar_/status/1799426109312045467", "row": "12"}]}},
  ],
  "marine-messe": [
    {"id": "aespa-2024-07-06", "title": "2024 aespa LIVE TOUR - SYNK : PARALLEL LINE - in JAPAN", "kind": "seated", "layout": {"date": "2024-07-06", "venueId": "marine-messe", "layoutSource": "https://x.com/i/web/status/1809603644087738818/photo/2", "viewBox": [215, 335, 190, 310], "stage": [[246, 345], [394, 345], [394, 402], [350, 402], [350, 438], [275, 438], [275, 402], [246, 402]], "blocks": [{"id": "S-1", "points": [[231, 452], [248, 452], [248, 498], [231, 498]], "approximate": true}, {"id": "S-2", "points": [[250, 450], [271, 450], [271, 498], [250, 498]], "approximate": true}, {"id": "S-3", "points": [[273, 448], [294, 448], [294, 497], [273, 497]], "approximate": true}, {"id": "S-4", "points": [[298, 446], [322, 446], [322, 496], [298, 496]], "approximate": true}, {"id": "S-5", "points": [[325, 443], [348, 443], [348, 495], [325, 495]], "approximate": true}, {"id": "S-6", "points": [[354, 440], [377, 440], [377, 494], [354, 494]], "approximate": true}, {"id": "S-7", "points": [[378, 438], [398, 438], [398, 492], [378, 492]], "approximate": true}, {"id": "Y-1", "points": [[227, 515], [246, 515], [246, 569], [227, 569]], "approximate": true}, {"id": "Y-2", "points": [[248, 515], [268, 515], [268, 569], [248, 569]], "approximate": true}, {"id": "Y-3", "points": [[271, 514], [292, 514], [292, 568], [271, 568]], "approximate": true}, {"id": "Y-4", "points": [[296, 514], [319, 514], [319, 568], [296, 568]], "approximate": true}, {"id": "Y-5", "points": [[323, 513], [348, 513], [348, 567], [323, 567]], "approximate": true}, {"id": "Y-6", "points": [[352, 513], [375, 513], [375, 566], [352, 566]], "approximate": true}, {"id": "Y-7", "points": [[378, 512], [396, 512], [396, 565], [378, 565]], "approximate": true}, {"id": "N-1", "points": [[222, 581], [242, 581], [242, 638], [222, 638]], "approximate": true}, {"id": "N-2", "points": [[245, 581], [263, 581], [263, 638], [245, 638]], "approximate": true}, {"id": "N-3", "points": [[265, 581], [287, 581], [287, 638], [265, 638]], "approximate": true}, {"id": "N-4", "points": [[288, 600], [312, 600], [312, 632], [288, 632]], "approximate": true}, {"id": "N-5", "points": [[315, 580], [348, 580], [348, 637], [315, 637]], "approximate": true}, {"id": "N-6", "points": [[348, 580], [371, 580], [371, 637], [348, 637]], "approximate": true}, {"id": "N-7", "points": [[373, 579], [396, 579], [396, 636], [373, 636]], "approximate": true}], "photos": [{"block": "S-2", "url": "https://x.com/warechatta/status/1809603644087738818", "photo": 3, "source": "https://x.com/warechatta/status/1809603644087738818", "row": "18"}]}},
  ],
  "miyagi-arena": [
    {"id": "twice-2019-11-16", "title": "TWICE「TWICELIGHTS IN JAPAN」宮城公演", "kind": "seated", "layout": {"date": "2019-11-16", "venueId": "miyagi-arena", "layoutSource": "https://x.com/i/web/status/2033369432450596947/photo/1", "viewBox": [225, 175, 255, 700], "stage": [[293, 182], [400, 182], [400, 209], [447, 209], [447, 305], [355, 305], [355, 418], [341, 418], [341, 305], [247, 305], [247, 209], [293, 209]], "subStage": [[330, 420], [375, 420], [391, 450], [391, 530], [375, 555], [330, 555], [314, 530], [314, 450]], "blocks": [{"id": "A1", "points": [[238, 350], [259, 350], [259, 482], [238, 482]]}, {"id": "A2", "points": [[264, 350], [289, 350], [289, 482], [264, 482]]}, {"id": "A3", "points": [[298, 350], [320, 350], [320, 470], [298, 470]], "approximate": true}, {"id": "A5", "points": [[373, 350], [400, 350], [400, 470], [373, 470]], "approximate": true}, {"id": "A6", "points": [[409, 350], [435, 350], [435, 482], [409, 482]]}, {"id": "A7", "points": [[441, 350], [464, 350], [464, 482], [441, 482]]}, {"id": "B1", "points": [[238, 514], [264, 514], [264, 664], [238, 664]]}, {"id": "B2", "points": [[268, 514], [293, 514], [293, 664], [268, 664]]}, {"id": "B3", "points": [[300, 530], [327, 530], [327, 664], [300, 664]], "approximate": true}, {"id": "B4", "points": [[330, 560], [375, 560], [375, 664], [330, 664]], "approximate": true}, {"id": "B5", "points": [[377, 530], [405, 530], [405, 664], [377, 664]], "approximate": true}, {"id": "B6", "points": [[409, 514], [435, 514], [435, 664], [409, 664]]}, {"id": "B7", "points": [[438, 514], [464, 514], [464, 664], [438, 664]]}, {"id": "C1", "points": [[248, 695], [265, 695], [265, 760], [248, 760]], "approximate": true}, {"id": "C2", "points": [[273, 695], [293, 695], [293, 863], [273, 863]], "approximate": true}, {"id": "C3", "points": [[300, 695], [332, 695], [332, 818], [300, 818]], "approximate": true}, {"id": "C4", "points": [[341, 695], [368, 695], [368, 818], [341, 818]], "approximate": true}, {"id": "C5", "points": [[375, 695], [405, 695], [405, 818], [375, 818]], "approximate": true}, {"id": "C6", "points": [[414, 695], [436, 695], [436, 860], [414, 860]], "approximate": true}, {"id": "C7", "points": [[444, 695], [460, 695], [460, 760], [444, 760]], "approximate": true}], "photos": [{"block": "B4", "url": "https://x.com/tatukamo1105/status/2033369432450596947", "photo": 2, "source": "https://x.com/tatukamo1105/status/2033369432450596947", "positionLabel": "後方"}, {"block": "C5", "url": "https://x.com/bell0629/status/1195597397600026624", "photo": 1, "source": "https://x.com/bell0629/status/1195597397600026624", "row": "5"}]}},
  ],
  "vantelin-dome": [
    {"id": "tomorrow-x-together-2024-08-04", "title": "TOMORROW X TOGETHER WORLD TOUR <ACT : PROMISE> IN JAPAN", "kind": "seated", "layout": {"date": "2024-08-04", "venueId": "vantelin-dome", "layoutSource": "https://x.com/i/web/status/1820113050793656476/photo/3", "viewBox": [140, 140, 620, 750], "stage": [[180, 322], [212, 330], [212, 503], [330, 503], [330, 530], [212, 530], [212, 705], [180, 710], [160, 600], [160, 430]], "subStage": [[330, 470], [410, 470], [410, 560], [330, 560]], "blocks": [{"id": "F8", "points": [[255, 180], [292, 180], [292, 228], [255, 228]]}, {"id": "F7", "points": [[299, 157], [336, 157], [336, 228], [299, 228]]}, {"id": "F6", "points": [[343, 157], [380, 157], [380, 228], [343, 228]]}, {"id": "F5", "points": [[387, 180], [424, 180], [424, 228], [387, 228]]}, {"id": "F4", "points": [[431, 195], [468, 195], [468, 228], [431, 228]]}, {"id": "E8", "points": [[254, 235], [291, 235], [291, 335], [254, 335]]}, {"id": "E7", "points": [[297, 235], [335, 235], [335, 335], [297, 335]]}, {"id": "E6", "points": [[341, 235], [380, 235], [380, 335], [341, 335]]}, {"id": "E5", "points": [[385, 235], [423, 235], [423, 335], [385, 335]]}, {"id": "E4", "points": [[430, 235], [467, 235], [467, 335], [430, 335]]}, {"id": "E3", "points": [[473, 235], [511, 235], [511, 335], [473, 335]]}, {"id": "E2", "points": [[517, 238], [555, 238], [555, 325], [517, 325]], "approximate": true}, {"id": "D8", "points": [[253, 343], [272, 343], [272, 445], [253, 445]], "approximate": true}, {"id": "D6", "points": [[360, 343], [380, 343], [380, 372], [360, 372]], "approximate": true}, {"id": "D5", "points": [[386, 343], [422, 343], [422, 405], [386, 405]]}, {"id": "D4", "points": [[430, 343], [466, 343], [466, 405], [430, 405]]}, {"id": "D3", "points": [[474, 343], [503, 343], [503, 372], [474, 372]], "approximate": true}, {"id": "G9", "points": [[522, 367], [567, 367], [567, 399], [522, 399]], "approximate": true}, {"id": "G8", "points": [[522, 411], [567, 411], [567, 443], [522, 443]], "approximate": true}, {"id": "G7", "points": [[500, 456], [567, 456], [567, 488], [500, 488]], "approximate": true}, {"id": "G6", "points": [[462, 501], [567, 501], [567, 533], [462, 533]], "approximate": true}, {"id": "G5", "points": [[500, 545], [567, 545], [567, 577], [500, 577]], "approximate": true}, {"id": "G4", "points": [[522, 589], [567, 589], [567, 621], [522, 621]], "approximate": true}, {"id": "G3", "points": [[522, 635], [567, 635], [567, 667], [522, 667]], "approximate": true}, {"id": "H10", "points": [[576, 325], [678, 325], [678, 357], [576, 357]]}, {"id": "H9", "points": [[576, 371], [678, 371], [678, 401], [576, 401]]}, {"id": "H8", "points": [[576, 415], [678, 415], [678, 446], [576, 446]]}, {"id": "H7", "points": [[576, 459], [678, 459], [678, 490], [576, 490]]}, {"id": "H6", "points": [[576, 503], [678, 503], [678, 535], [576, 535]]}, {"id": "H5", "points": [[576, 547], [678, 547], [678, 580], [576, 580]]}, {"id": "H4", "points": [[576, 591], [678, 591], [678, 624], [576, 624]]}, {"id": "H3", "points": [[576, 635], [678, 635], [678, 668], [576, 668]]}, {"id": "H2", "points": [[576, 680], [678, 680], [678, 713], [576, 713]]}, {"id": "I9", "points": [[689, 371], [740, 371], [740, 404], [689, 404]]}, {"id": "I8", "points": [[689, 415], [740, 415], [740, 448], [689, 448]]}, {"id": "I7", "points": [[689, 459], [740, 459], [740, 492], [689, 492]]}, {"id": "I6", "points": [[689, 503], [740, 503], [740, 536], [689, 536]]}, {"id": "I5", "points": [[689, 547], [740, 547], [740, 580], [689, 580]]}, {"id": "I4", "points": [[689, 591], [740, 591], [740, 624], [689, 624]]}, {"id": "I3", "points": [[689, 635], [740, 635], [740, 668], [689, 668]]}, {"id": "A1", "points": [[250, 589], [271, 589], [271, 689], [250, 689]], "approximate": true}, {"id": "A3", "points": [[355, 650], [373, 650], [373, 690], [355, 690]], "approximate": true}, {"id": "A4", "points": [[382, 628], [415, 628], [415, 690], [382, 690]]}, {"id": "A5", "points": [[426, 628], [458, 628], [458, 690], [426, 690]]}, {"id": "A6", "points": [[470, 650], [494, 650], [494, 690], [470, 690]], "approximate": true}, {"id": "B1", "points": [[247, 700], [282, 700], [282, 797], [247, 797]]}, {"id": "B2", "points": [[290, 714], [326, 714], [326, 797], [290, 797]]}, {"id": "B3", "points": [[336, 700], [370, 700], [370, 797], [336, 797]]}, {"id": "B4", "points": [[379, 700], [415, 700], [415, 797], [379, 797]]}, {"id": "B5", "points": [[423, 700], [458, 700], [458, 797], [423, 797]]}, {"id": "B6", "points": [[467, 700], [502, 700], [502, 797], [467, 797]]}, {"id": "B7", "points": [[510, 705], [545, 705], [545, 796], [510, 796]]}, {"id": "C1", "points": [[247, 806], [281, 806], [281, 854], [247, 854]]}, {"id": "C2", "points": [[290, 806], [326, 806], [326, 875], [290, 875]]}, {"id": "C3", "points": [[332, 806], [369, 806], [369, 875], [332, 875]]}, {"id": "C4", "points": [[377, 805], [413, 805], [413, 861], [377, 861]]}, {"id": "C5", "points": [[420, 805], [455, 805], [455, 840], [420, 840]], "approximate": true}], "photos": [{"block": "I4", "url": "https://x.com/4jfoxx/status/1820113050793656476", "photo": 1, "source": "https://x.com/4jfoxx/status/1820113050793656476", "row": "7"}]}},
  ],
};
