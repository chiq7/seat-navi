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
};
