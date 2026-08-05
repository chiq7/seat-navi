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
  /** 開業日まで公式に確認できる会場だけをISO日付で保持する。 */
  openedAt?: string;
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
  "tokyo-dome": {
    summary:
      "東京ドームは、東京都文京区後楽にある全天候型の多目的スタジアムです。公式の施設案内では最大収容人数は約55,000人とされ、ライブではステージ位置、アリーナの仮設客席、機材席の有無によって実際の座席配置と収容人数が公演ごとに変わります。",
    metaDescription:
      "東京ドームの収容人数、座席・ゲートの見方、水道橋・後楽園駅からのアクセス、公演予定と座席レポを確認できます。",
    facts: [
      { label: "最大収容規模", value: "約55,000人（公式施設案内）" },
      { label: "開業", value: "1988年3月17日" },
      { label: "所在地", value: "東京都文京区後楽1-3-61" },
      { label: "最寄り", value: "水道橋駅・後楽園駅・春日駅" },
    ],
    sections: [
      {
        heading: "ライブのアリーナ配置は固定の座席表だけで断定しない",
        body:
          "東京ドームの公式座席案内では、スタンド・外野席、2階席、バルコニー席などの基本的な位置を確認できます。一方、ライブのアリーナ部分はステージの向き、花道、機材席、仮設客席の配置で大きく変わります。チケットのゲート・通路・列・番号を公式案内と照合したうえで、主催者が出す当日の案内や同じ公演の座席報告を参考にしてください。ちけレポのアリーナ予想図も、確定した座席表ではなく投稿をもとにした参考情報として扱います。",
      },
      {
        heading: "チケットで確認したいのはゲートと階層",
        body:
          "東京ドームの座席案内は、1階スタンド・外野席、2階スタンド、バルコニー席といった区分で会場内を把握できます。ライブでは同じ番号でもステージに対する正面・側面・背面の意味が異なるため、座席番号だけで見え方を決めないことが大切です。入場ゲートは当日の入場口や導線に関わるため、チケットと主催者案内を優先して確認してください。",
      },
      {
        heading: "水道橋・後楽園・春日駅のどこから入るかを公演前に決める",
        body:
          "公式アクセス案内では、JR水道橋駅、都営三田線の水道橋駅、東京メトロ丸ノ内線・南北線の後楽園駅、都営大江戸線の春日駅が最寄り駅として案内されています。終演後は同じ駅へ人が集中しやすいため、行きの到着駅だけでなく、帰りに使う路線と待ち合わせ場所も主催者の退場案内を確認して決めておくと動きやすくなります。",
      },
    ],
    sources: [
      { label: "東京ドーム 公式施設概要", url: "https://www.tokyo-dome.co.jp/dome/about/" },
      { label: "公式座席案内・場内MAP", url: "https://www.tokyo-dome.co.jp/dome/seat/" },
      { label: "公式アクセス案内", url: "https://www.tokyo-dome.co.jp/dome/access/" },
      { label: "公式コンサート・イベント一覧", url: "https://www.tokyo-dome.co.jp/dome/event/" },
      { label: "公式FAQ（開業日・施設情報）", url: "https://www.tokyo-dome.co.jp/faq/facility/dome/" },
    ],
    updatedAt: "2026-08-03",
    officialUrl: "https://www.tokyo-dome.co.jp/dome/",
    capacity: 55000,
    openedAt: "1988-03-17",
    address: {
      postalCode: "112-0004",
      region: "東京都",
      locality: "文京区",
      streetAddress: "後楽1丁目3番61号",
    },
  },
  "yokohama-arena": {
    summary:
      "横浜アリーナは、新横浜にある最大約17,000人規模の多目的イベント会場です。ライブではステージの向きや客席レイアウトを変えられるため、同じ会場でもチケットのセンター席・アリーナ席・スタンド席の位置関係は公演ごとに異なります。",
    metaDescription:
      "横浜アリーナの収容人数、座席の見え方、A・Bステージの違い、最寄り駅からのアクセス、公演予定と座席レポを確認できます。",
    facts: [
      { label: "最大収容規模", value: "約17,000人" },
      { label: "アリーナ面積", value: "約8,000㎡（114m×78m）" },
      { label: "所在地", value: "横浜市港北区新横浜3-10" },
      { label: "最寄り", value: "新横浜駅" },
    ],
    sections: [
      {
        heading: "ライブの座席は公演ごとのステージ形式で変わる",
        body:
          "横浜アリーナでは、縦長に使うAステージと横長に使うBステージを基本に、変形ステージにも対応しています。公式の案内ではAステージは立見込み約13,000人、Bステージは立見込み約12,000人の例が示されています。座席番号だけで見え方を決めず、当日のステージ形式、花道・機材席の有無、同じ公演の座席報告をあわせて確認してください。",
      },
      {
        heading: "センター席・アリーナ席・スタンド席の見方",
        body:
          "センター席は公演ごとにアリーナ床面へ設けられる仮設席で、ブロックや列の配置は固定ではありません。アリーナ席とスタンド席は会場の座席案内で大まかな位置を確認できますが、ステージの向きで正面・側面・背面の意味が変わります。ちけレポのアリーナ予想図は確定図ではなく、投稿が集まった公演ごとの参考情報として利用してください。",
      },
      {
        heading: "新横浜での入退場と帰り道",
        body:
          "横浜アリーナは新横浜駅から徒歩圏です。終演直後は駅、会場周辺、飲食店の導線が同時に混みやすいため、チケットに記載された入場案内を確認し、帰りの路線と待ち合わせ場所を公演前に決めておくと動きやすくなります。主催者が指定する入場時間や規制退場がある場合は、そちらを優先してください。",
      },
    ],
    sources: [
      { label: "横浜アリーナ 公式サイト", url: "https://www.yokohama-arena.co.jp/" },
      { label: "公式座席案内", url: "https://www.yokohama-arena.co.jp/seatguide/" },
      { label: "公式設備案内（最大収容人数）", url: "https://www.yokohama-arena.co.jp/organizer/equipment/" },
      { label: "公式コンサート・ショー利用プラン", url: "https://www.yokohama-arena.co.jp/organizer/plans/" },
      { label: "公式交通アクセス", url: "https://www.yokohama-arena.co.jp/access/" },
    ],
    updatedAt: "2026-08-01",
    officialUrl: "https://www.yokohama-arena.co.jp/",
    capacity: 17000,
    address: {
      postalCode: "222-0033",
      region: "神奈川県",
      locality: "横浜市港北区",
      streetAddress: "新横浜3丁目10番地",
    },
  },
  "ariake-arena": {
    summary:
      "有明アリーナは、東京都江東区有明にある最大約15,000席の多目的アリーナです。ライブでは1階アリーナ部分に仮設客席やスタンディング席が設けられるため、座席の位置関係は公演ごとのステージ構成・客席レイアウトとあわせて確認する必要があります。",
    metaDescription:
      "有明アリーナの収容人数、座席の見え方、フロア構成、最寄り駅からのアクセス、公演予定と座席レポを確認できます。",
    facts: [
      { label: "最大収容規模", value: "約15,000席（仮設席含む）" },
      { label: "メインアリーナ面積", value: "約4,100㎡" },
      { label: "所在地", value: "東京都江東区有明1丁目11番1号" },
      { label: "最寄り駅", value: "新豊洲駅・有明テニスの森駅 徒歩約8分" },
    ],
    sections: [
      {
        heading: "アリーナ席は固定図だけで断定しない",
        body:
          "有明アリーナの公式案内では、1階アリーナ部分はイベントに応じて移動観覧席、仮設客席、スタンディング席を設ける運用です。そのため、同じブロック名や列でもステージの向き、花道、機材席の有無で見え方は変わります。固定スタンドの位置を確認したうえで、当日の主催者案内と同じ公演の座席報告を参考にするのが安全です。ちけレポのアリーナ予想図は、確定した座席表ではなく投稿をもとにした参考情報として利用してください。",
      },
      {
        heading: "フロア構成と会場内で確認したい場所",
        body:
          "会場は1階がアリーナフロア、2〜4階がスタンドフロアです。公式フロアガイドでは、売店は2階と3階、コインロッカーは2階北側メインエントランスと南側ロッカールームに案内されています。営業状況や利用可能な設備は公演で変わるため、当日は主催者の案内を優先してください。",
      },
      {
        heading: "駅からの導線は来場時と帰路で分けて考える",
        body:
          "最寄りはゆりかもめの新豊洲駅・有明テニスの森駅で、どちらも徒歩約8分です。りんかい線の国際展示場駅・東雲駅からは徒歩約17分です。公式は周辺の生活動線への配慮から来場ルートと帰路ルートを分けて案内しているため、行きと帰りで同じ道を使えるとは限りません。公演前にチケット・主催者案内の入場口と公式アクセス案内を確認しておくと安心です。",
      },
    ],
    sources: [
      { label: "有明アリーナ 公式サイト", url: "https://ariake-arena.tokyo/" },
      { label: "公式メインアリーナ施設案内", url: "https://ariake-arena.tokyo/main-arena/" },
      { label: "公式フロアガイド", url: "https://ariake-arena.tokyo/floor/" },
      { label: "公式アクセス案内", url: "https://ariake-arena.tokyo/access/" },
      { label: "公式施設概要", url: "https://ariake-arena.tokyo/about/" },
    ],
    updatedAt: "2026-08-02",
    officialUrl: "https://ariake-arena.tokyo/",
    capacity: 15000,
    address: {
      postalCode: "135-0063",
      region: "東京都",
      locality: "江東区",
      streetAddress: "有明1丁目11番1号",
    },
  },
  "saitama-super-arena": {
    summary:
      "さいたまスーパーアリーナ（現在の施設愛称：GMOアリーナさいたま）は、可動する客席・壁面の仕組みにより、ライブの規模やステージ構成に合わせて会場形状を変えられる大型多目的アリーナです。2026年1月13日から2027年春にかけて、スタジアム・メインアリーナ・コミュニティアリーナは大規模改修工事のため利用できません。",
    metaDescription:
      "さいたまスーパーアリーナ（GMOアリーナさいたま）の収容人数、座席構成、アクセス、改修期間中の利用状況、公演予定と座席レポを確認できます。",
    facts: [
      { label: "施設愛称", value: "GMOアリーナさいたま" },
      { label: "最大収容規模", value: "約37,000席（スタジアム形式）" },
      { label: "最寄り駅", value: "さいたま新都心駅 徒歩3分" },
      { label: "改修期間", value: "2026年1月13日〜2027年春（主要アリーナ）" },
    ],
    sections: [
      {
        heading: "公演前に最初に確認したい改修期間",
        body:
          "現在は大規模改修工事により、スタジアム・メインアリーナ・コミュニティアリーナを利用できません。展示ホール、TOIRO、けやきひろばは一部休館日を除いて営業が続いています。公演を探すときは、会場名だけで判断せず、主催者の開催案内と公式の施設営業情報を同時に確認してください。",
      },
      {
        heading: "座席構成と見え方の考え方",
        body:
          "この会場は約9,000席を伴う可動ブロックによって、スタジアム形式とアリーナ形式を切り替えられます。最大収容規模はスタジアム形式で約37,000席、メインアリーナのセンターステージ形式では約22,500席と公式案内されています。ライブごとにステージ位置、花道、機材席、アリーナブロックが変わるため、固定席の案内だけではアリーナ内の位置を断定できません。ちけレポでは、同じ公演の座席報告・アリーナ予想図を公式座席案内とあわせて確認するのがおすすめです。",
      },
      {
        heading: "アクセスと入場口",
        body:
          "最寄りはさいたま新都心駅から徒歩3分、北与野駅から徒歩7分です。施設は2階デッキで駅周辺とつながっており、入場口はチケットや主催者案内に記載されたGATEを優先して確認します。公式は公共交通機関の利用を案内しているため、終演後の混雑も見込み、帰路の乗車経路を決めてから向かうと安心です。",
      },
    ],
    sources: [
      { label: "GMOアリーナさいたま 公式サイト", url: "https://www.saitama-arena.co.jp/" },
      { label: "公式アクセス案内", url: "https://www.saitama-arena.co.jp/access/train.html" },
      { label: "公式施設案内（座席構成・収容規模）", url: "https://www.saitama-arena.co.jp/e/facility/" },
      { label: "2026年以降の主要アリーナ改修に関する公式案内", url: "https://www.saitama-arena.co.jp/news/2026/01083293.html" },
    ],
    updatedAt: "2026-07-31",
    officialUrl: "https://www.saitama-arena.co.jp/",
    capacity: 37000,
    address: {
      postalCode: "330-9111",
      region: "埼玉県",
      locality: "さいたま市中央区",
      streetAddress: "新都心8番地",
    },
  },
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
  "kyocera-dome": {
    summary:
      "京セラドーム大阪は、大阪市西区千代崎にある全天候型のドームです。公式の施設案内では最大収容可能人数は55,000人（プロ野球時最大席数36,220席）とされています。ライブ時はステージ位置、アリーナの仮設席、機材席によって客席構成が変わるため、野球時の座席図だけでアリーナ内の位置を断定することはできません。",
    metaDescription:
      "京セラドーム大阪の収容人数、座席表・ゲートの見方、アクセス、公演予定、座席報告とアリーナ予想を確認できます。",
    facts: [
      { label: "最大収容可能人数", value: "55,000人（プロ野球時最大席数36,220席）" },
      { label: "アリーナ面積", value: "13,200㎡" },
      { label: "所在地", value: "大阪市西区千代崎3-中2-1" },
      { label: "館内への入場", value: "3F入場ゲート（公式フロアガイド）" },
    ],
    sections: [
      {
        heading: "座席表は固定スタンドと可動アリーナを分けて見る",
        body:
          "公式の座席検索は一般的な野球開催時の座席配列を案内しており、コンサート時には一部の座席位置が変わる場合があると明記されています。上段・下段のスタンド席はチケットのゲート、通路、列、番号と照合する目安になりますが、コンサート時のアリーナ席は可動のため同じ図には対応していません。花道やステージ位置まで含めて見たいときは、主催者案内と同じ公演の座席報告・アリーナ予想をあわせて確認してください。",
      },
      {
        heading: "入場前にチケットのゲートと館内フロアを確認する",
        body:
          "公式フロアガイドでは、球場内へは3F入場ゲートから入場すると案内されています。3Fは下段席・入場ゲート、5Fは上段席のフロアとして示されていますが、利用可能な入口や導線はイベントで変わる場合があります。チケット記載のゲートと主催者の当日案内を優先し、座席番号だけで入場口を決めないようにしてください。",
      },
      {
        heading: "アクセスは会場と主催者の案内をセットで見る",
        body:
          "京セラドーム大阪はイベントによって入場口や周辺導線が変わります。公式は近隣・周辺道路への配慮から公共交通機関の利用を案内しています。来場前に公式の路線図・入場口案内と主催者の案内を確認し、終演後の待ち合わせや帰路も先に決めておくと動きやすくなります。",
      },
    ],
    sources: [
      { label: "京セラドーム大阪 公式座席案内", url: "https://www.kyoceradome-osaka.jp/seat/" },
      { label: "公式アリーナ施設案内", url: "https://www.kyoceradome-osaka.jp/use_guide/arena/" },
      { label: "公式フロアガイド", url: "https://www.kyoceradome-osaka.jp/floor_guide/" },
      { label: "公式アクセス案内", url: "https://www.kyoceradome-osaka.jp/access/" },
      { label: "公式イベント一覧", url: "https://www.kyoceradome-osaka.jp/events/" },
    ],
    updatedAt: "2026-08-05",
    officialUrl: "https://www.kyoceradome-osaka.jp/",
    capacity: 55000,
    address: {
      postalCode: "550-0023",
      region: "大阪府",
      locality: "大阪市西区",
      streetAddress: "千代崎3-中2-1",
    },
  },
  "osaka-jo-hall": {
    summary:
      "大阪城ホールは、大阪市中央区大阪城にある多目的アリーナです。公式の座席表では、コンサートごとにステージ設定が異なるため、アリーナの座席配置もその都度変わると案内されています。最大16,000人のステージパターンCを含む複数のレイアウトがあり、同じ会場でも公演ごとに座席の見え方は変わります。",
    metaDescription:
      "大阪城ホールの座席表、アリーナ・スタンドの見え方、収容人数、アクセス、公演予定、座席報告を確認できます。",
    facts: [
      { label: "最大収容人員", value: "16,000人（ステージパターンC）" },
      { label: "可動アリーナ席", value: "最大4,500人" },
      { label: "所在地", value: "大阪市中央区大阪城3-1" },
      { label: "最寄り", value: "大阪城公園駅・大阪ビジネスパーク駅 徒歩5分" },
    ],
    sections: [
      {
        heading: "アリーナ席は公演ごとのステージ設定で変わる",
        body:
          "公式は、アリーナ席の詳細はコンサートごとの演出上の理由から事前に案内していないと説明しています。パターンAは最大6,200人、Bは最大11,200人、Cはセンターステージを含む最大16,000人の例が案内されています。チケットのアリーナ番号だけでステージまでの距離や向きを決めず、主催者の案内、同じ公演の座席報告、アリーナ予想図を参考情報として確認してください。",
      },
      {
        heading: "スタンドはブロック、アリーナは当日構成で確認する",
        body:
          "公式座席表ではA〜NブロックとBOX席のスタンド位置を確認できます。アリーナ部分は可動席で、公演ごとのステージ構成により位置関係が変わります。スタンドのブロック・列・席番号は公式図で把握し、アリーナは固定図として扱わず、当日の案内を優先してください。",
      },
      {
        heading: "駅からの到着と帰りの混雑を分けて考える",
        body:
          "公式アクセス案内では、JR大阪城公園駅と大阪ビジネスパーク駅から徒歩5分、森ノ宮駅・大阪城北詰駅から徒歩15分とされています。会場には一般来場者用の駐車場がないため、公共交通機関を利用し、終演後は混雑状況に応じて複数の駅を使えるようにしておくと安心です。",
      },
    ],
    sources: [
      { label: "大阪城ホール 公式座席表", url: "https://www.osaka-johall.com/seat/" },
      { label: "公式アクセス案内", url: "https://www.osaka-johall.com/access/" },
      { label: "公式フロアガイド", url: "https://www.osaka-johall.com/floorguide/" },
      { label: "公式施設概要", url: "https://www.osaka-johall.com/organizer/arena/" },
    ],
    updatedAt: "2026-08-05",
    officialUrl: "https://www.osaka-johall.com/",
    capacity: 16000,
    address: {
      postalCode: "540-0002",
      region: "大阪府",
      locality: "大阪市中央区",
      streetAddress: "大阪城3-1",
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
