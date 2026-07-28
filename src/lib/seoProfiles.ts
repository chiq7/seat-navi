export type SeoFact = {
  label: string;
  value: string;
};

export type SeoProfileSection = {
  heading: string;
  body: string;
};

export type SeoSource = {
  label: string;
  url: string;
};

export type EditorialSeoProfile = {
  summary: string;
  metaDescription: string;
  facts: SeoFact[];
  sections: SeoProfileSection[];
  sources: SeoSource[];
  updatedAt: string;
};

export type VenueSeoProfile = EditorialSeoProfile & {
  officialUrl: string;
  capacity: number;
  openedAt: string;
  address: {
    postalCode: string;
    region: string;
    locality: string;
    streetAddress: string;
  };
};

export type ArtistSeoProfile = EditorialSeoProfile & {
  schemaType: "MusicGroup" | "Person";
  officialUrl: string;
  alternateName?: string;
};

const VENUE_SEO_PROFILES: Record<string, VenueSeoProfile> = {
  "k-arena": {
    summary:
      "Kアリーナ横浜は、横浜・みなとみらいに2023年9月29日に開業した約2万席の音楽専用アリーナです。すべての座席をステージ正面へ向けた扇形の配置を特徴とし、音楽ライブを中心に利用されています。",
    metaDescription:
      "Kアリーナ横浜の収容人数、座席・LEVELの見え方、最寄り駅からのアクセス、公演予定、過去に公演したアーティストをまとめて確認できます。",
    facts: [
      { label: "収容規模", value: "約20,000席" },
      { label: "開業", value: "2023年9月29日" },
      { label: "所在地", value: "横浜市西区みなとみらい6-2-14" },
      { label: "最寄り", value: "新高島駅から徒歩5分" },
    ],
    sections: [
      {
        heading: "座席構成と見え方",
        body:
          "公式案内では、すべての座席がステージ正面を向く扇形配置で、アリーナと複数階のスタンドで構成されています。チケットに記載されたLEVEL・GATE・列・座席番号を公式シートマップと照合すると、おおよその位置を確認できます。実際の見え方は公演ごとのステージ構成や機材配置で変わります。",
      },
      {
        heading: "アクセス",
        body:
          "横浜駅東口から徒歩9分、新高島駅4番出口から徒歩5分、みなとみらい駅2番出口から徒歩12分が公式の目安です。公演開催日の駐車場は予約制のため、公共交通機関の利用と当日の入退場ルート確認が安心です。",
      },
      {
        heading: "チケットで確認したい項目",
        body:
          "Kアリーナ横浜ではLEVELとGATEが座席位置を把握する重要な手掛かりです。アリーナ部分の形状は公演ごとに変わるため、固定席の公式座席図に加えて、同じ公演の座席報告やアリーナ予想図を確認してください。",
      },
    ],
    sources: [
      { label: "Kアリーナ横浜 公式サイト", url: "https://k-arena.com/" },
      { label: "公式シートマップ", url: "https://k-arena.com/seat/" },
      { label: "公式アクセス案内", url: "https://k-arena.com/access/" },
      { label: "2023年9月29日開業のお知らせ", url: "https://k-arena.com/news/20230126-1/" },
    ],
    updatedAt: "2026-07-28",
    officialUrl: "https://k-arena.com/",
    capacity: 20000,
    openedAt: "2023-09-29",
    address: {
      postalCode: "220-8507",
      region: "神奈川県",
      locality: "横浜市西区",
      streetAddress: "みなとみらい6-2-14",
    },
  },
};

const ARTIST_SEO_PROFILES: Record<string, ArtistSeoProfile> = {
  niziu: {
    summary:
      "NiziU（ニジュー）は、ソニーミュージックとJYPによるオーディション企画「Nizi Project」から誕生した9人組のグローバル・ガールズグループです。グループ名には、プロジェクト名の「Nizi」に、メンバーやファンを表す「U」が寄り添うという意味が込められています。",
    metaDescription:
      "NiziUのプロフィール、公演予定、チケット当選率、座席報告、アリーナ予想、現地レポ、セットリストをまとめて確認できます。",
    facts: [
      { label: "読み方", value: "ニジュー" },
      { label: "構成", value: "9人組" },
      { label: "誕生企画", value: "Nizi Project" },
      { label: "活動形態", value: "グローバル・ガールズグループ" },
    ],
    sections: [
      {
        heading: "NiziUという名前の由来",
        body:
          "「Nizi Project」から生まれた証としての「Nizi」に、メンバー同士と支えてくれるファンを表す「U」を組み合わせた名称です。「Need You」のニュアンスも含まれると公式プロフィールで紹介されています。",
      },
      {
        heading: "ライブ情報の見方",
        body:
          "このページではNiziUの開催予定と過去公演を会場・日付ごとに整理しています。公演を選ぶと、当落報告、座席位置、アリーナ予想図、現地レポを同じ公演単位で確認できます。公式発表はページ下部の公式ニュースから確認できます。",
      },
    ],
    sources: [
      { label: "NiziU 公式サイト", url: "https://niziu.com/s/n123/" },
      { label: "Sony Music 公式プロフィール", url: "https://www.sonymusic.co.jp/artist/niziu/profile/" },
      { label: "Sony Music 公式ニュース", url: "https://www.sonymusic.co.jp/artist/niziu/info/" },
    ],
    updatedAt: "2026-07-28",
    schemaType: "MusicGroup",
    officialUrl: "https://niziu.com/s/n123/",
    alternateName: "ニジュー",
  },
};

export function getVenueSeoProfile(id: string): VenueSeoProfile | null {
  return VENUE_SEO_PROFILES[id] ?? null;
}

export function getArtistSeoProfile(slug: string): ArtistSeoProfile | null {
  return ARTIST_SEO_PROFILES[slug] ?? null;
}

