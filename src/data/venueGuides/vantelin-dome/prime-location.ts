// Position relationship read from the currently linked 2026 seat map and 3F/4F
// floor diagrams. These four regions are not individual numbered seat polygons.
export const vantelinPrimeLocations = [
  { id: "twin-left", label: "3塁側ツイン", level: "ツイン", area: "3塁側", floor: "4F", color: "#b9ce8f", point: [100, 280], anchor: [90, 230], path: "M76 251 Q83 143 160 78 L178 97 Q108 154 102 252 Z" },
  { id: "twin-right", label: "1塁側ツイン", level: "ツイン", area: "1塁側", floor: "4F", color: "#b9ce8f", point: [400, 280], anchor: [410, 230], path: "M424 251 Q417 143 340 78 L322 97 Q392 154 398 252 Z" },
  { id: "box", label: "ボックス", level: "ボックス", area: "センター側", floor: "4F", color: "#b5cde0", point: [250, 52], anchor: [250, 52], path: "M177 45 Q250 19 323 45 L314 70 Q250 49 186 70 Z" },
  { id: "restaurant", label: "レストラン", level: "レストラン", area: "センター側", floor: "3F", color: "#bedacb", point: [250, 157], anchor: [250, 104], path: "M199 98 Q250 82 301 98 L294 116 Q250 103 206 116 Z" },
] as const;

export const vantelinPrimeLocationScope = {
  sourceUrls: ["https://dragons.jp/ticket/sales/image/2026/seat/map-primetwin.svg", "https://dragons.jp/nagoyadome/facilities/3f.php", "https://dragons.jp/nagoyadome/facilities/4f.php"],
  orientation: "home-bottom",
  precision: "seat-type-region",
  individualNumberPositionsVerified: false,
  continuousRoutesVerified: false,
} as const;
