export const VENUE_REGION_GROUPS = [
  {
    id: "hokkaido-tohoku",
    label: "北海道・東北",
    description: "札幌と宮城・利府のライブ会場",
    venueIds: ["sapporo-dome", "miyagi-arena"],
  },
  {
    id: "kanto",
    label: "関東",
    description: "東京、横浜、さいたま・所沢、千葉のライブ会場",
    venueIds: ["tokyo-dome", "belluna-dome", "zozo-marine", "mufg-stadium", "nissan-stadium", "saitama-super-arena", "yokohama-arena", "pia-arena-mm", "ariake-arena", "budokan", "yoyogi", "makuhari-messe", "k-arena", "tokyo-garden-theater"],
  },
  {
    id: "hokuriku-koshinetsu",
    label: "北陸・甲信越",
    description: "新潟市のライブ会場",
    venueIds: ["toki-messe"],
  },
  {
    id: "tokai",
    label: "東海",
    description: "愛知・名古屋のライブ会場",
    venueIds: ["vantelin-dome", "gaishi-hall"],
  },
  {
    id: "kansai",
    label: "関西",
    description: "大阪市と兵庫・西宮のライブ会場",
    venueIds: ["kyocera-dome", "koshien", "osaka-jo-hall", "edion-arena"],
  },
  {
    id: "chugoku-shikoku-kyushu",
    label: "中国・四国・九州",
    description: "広島市と福岡市のライブ会場",
    venueIds: ["hiroshima-arena", "paypay-dome", "marine-messe"],
  },
] as const;
