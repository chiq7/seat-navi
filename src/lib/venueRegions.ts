export const VENUE_REGION_GROUPS = [
  {
    id: "hokkaido-tohoku",
    label: "北海道・東北",
    description: "北海道・宮城の主要ライブ会場",
    venueIds: ["sapporo-dome", "miyagi-arena"],
  },
  {
    id: "kanto",
    label: "関東",
    description: "東京・神奈川・埼玉・千葉の主要ライブ会場",
    venueIds: ["tokyo-dome", "belluna-dome", "zozo-marine", "mufg-stadium", "nissan-stadium", "saitama-super-arena", "yokohama-arena", "pia-arena-mm", "ariake-arena", "budokan", "yoyogi", "makuhari-messe", "k-arena", "tokyo-garden-theater"],
  },
  {
    id: "hokuriku-koshinetsu",
    label: "北陸・甲信越",
    description: "新潟など北陸・甲信越の主要ライブ会場",
    venueIds: ["toki-messe"],
  },
  {
    id: "tokai",
    label: "東海",
    description: "愛知の主要ライブ会場",
    venueIds: ["vantelin-dome", "gaishi-hall"],
  },
  {
    id: "kansai",
    label: "関西",
    description: "大阪・兵庫の主要ライブ会場",
    venueIds: ["kyocera-dome", "koshien", "osaka-jo-hall", "edion-arena"],
  },
  {
    id: "chugoku-shikoku-kyushu",
    label: "中国・四国・九州",
    description: "広島・福岡の主要ライブ会場",
    venueIds: ["hiroshima-arena", "paypay-dome", "marine-messe"],
  },
] as const;
