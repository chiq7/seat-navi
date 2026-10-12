// D/E narrow sections have labels outside their official-PDF outlines. Their
// paths are transcribed from those vectors. F10/F11 are reconstructed from the
// adjacent official-PDF arc segments, as the parser merged both boxes into one.
// All paths use tokyoDomeSeatGeometry.json coordinates. The second PDF is only
// a visual cross-check, not a copied image/vector asset.
export const TOKYO_DOME_SHAPE_CORRECTIONS: Record<string, string> = {
  // B26 was extracted as an open partial outline. SVG therefore closed the
  // distant endpoints with a diagonal and rendered a pointed triangle. The
  // missing outer edge is the official centre-home counterpart of B24.
  B26: "M563.7,587.9 L565.6,563.8 C561.5,563.3 557.4,562.6 553.3,561.7 L550.6,578.6 C547.0,578.0 544.1,577.4 543.8,577.3 L542.1,584.2 Z",
  // The source parser combined both centre-field boxes and the surrounding
  // outfield arc into one open outline. Keep only the individual boxes here.
  F10: "M523.7,69.0 C533.5,65.7 545.5,62.2 552.2,60.6 L559.0,79.8 C549.0,82.4 538.5,85.1 530.8,88.2 Z",
  F11: "M606.1,60.5 C613.0,61.1 629.5,66.7 634.9,68.6 L627.7,88.2 C621.9,86.1 615.7,84.0 609.2,82.2 Z",
  D01: "M886.9,184.6 L891.5,183.8 L897.3,182.8 L865.0,146.6 L863.2,151.0 L862.9,151.7 L861.0,154.1 C861.0,154.1 872.1,166.2 886.9,184.6 Z",
  D02: "M907.5,211.6 L912.8,208.4 L917.6,205.5 L897.3,182.8 L891.5,183.8 L886.9,184.6 C893.3,192.6 900.4,201.7 907.5,211.6 Z",
  D51: "M267.0,183.8 L271.6,184.6 C286.4,166.2 297.5,154.1 297.5,154.1 L295.6,151.7 L295.3,151.0 L293.5,146.6 L261.2,182.8 Z",
  E06: "M977.6,316.5 C977.6,320.5 977.4,324.5 977.0,328.5 L984.5,329.6 C982.9,320.7 980.8,312.0 978.1,303.4 C978.0,308.8 977.8,311.6 977.6,313.1 C977.6,314.3 977.6,315.4 977.6,316.5 Z",
  E07: "M976.3,334.9 C975.1,343.8 973.1,353.0 970.3,362.4 L988.5,366.2 C988.1,356.1 987.2,346.1 985.6,336.2 Z",
  E08: "M988.6,372.8 L968.4,368.6 C967.1,372.9 965.5,377.3 963.9,381.8 L974.2,384.7 L970.7,396.9 L987.4,401.6 C988.3,391.9 988.7,382.3 988.6,372.8 Z",
  E44: "M184.3,384.7 L194.6,381.8 C192.9,377.3 191.4,372.9 190.0,368.6 L169.9,372.8 C169.8,382.3 170.2,391.9 171.1,401.6 L187.8,396.9 Z",
  E45: "M188.2,362.4 C185.4,353.0 183.4,343.8 182.2,334.9 L172.8,336.2 C171.3,346.1 170.4,356.1 170.0,366.2 Z",
  E46: "M181.4,328.5 C181.1,324.5 180.9,320.5 180.9,316.5 C180.9,315.4 180.9,314.3 180.9,313.1 C180.7,311.6 180.5,308.8 180.4,303.4 C177.7,312.0 175.6,320.7 174.0,329.6 Z",
};

// The C23-C25 and C73-C76 source entries contain an open corridor line rather
// than an area. These codes belong to the adjacent continuous C-tier strips.
export const TOKYO_DOME_BALCONY_CONTINUATIONS: Record<string, string> = {
  C23: "C19", C24: "C19", C25: "C19",
  C73: "C66", C74: "C66", C75: "C66", C76: "C66",
};

export const TOKYO_DOME_NARROW_ROW_CORRECTIONS: Record<string, [number, number]> = {
  D01: [1, 1], D02: [1, 1], D03: [1, 1], D04: [1, 5],
  D48: [1, 5], D49: [1, 1], D50: [1, 1], D51: [1, 1],
  // Official E06/E46 detail images show only the ordinary 11th row.
  E06: [11, 11], E07: [11, 15], E08: [11, 18],
  E44: [11, 18], E45: [11, 15], E46: [11, 11],
};
