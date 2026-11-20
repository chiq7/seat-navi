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

export const venueArenaPhotoArchives: Partial<Record<string, readonly Archive[]>> = {
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
