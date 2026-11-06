/**
 * Search-only venue identity catalogue, generated from the 839 public event audit.
 * Keeps raw event names/IDs intact; guideId is only set for already published guides.
 * Readings help users find existing pages and do not change official event attribution.
 */
export type SearchVenueCatalogEntry = {
  id: string;
  name: string;
  aliases: readonly string[];
  eventVenueNames: readonly string[];
  eventVenueIds: readonly string[];
  eventIds: readonly string[];
  prefecture: string | null;
  region: string | null;
  locality: string | null;
  guideId?: string;
  kind: "venue" | "ambiguous" | "multiple-venues";
  sourceUrls: readonly string[];
};

export const SEARCH_VENUE_CATALOG: readonly SearchVenueCatalogEntry[] = [
  {
    "id": "tokyo-dome",
    "name": "東京ドーム",
    "aliases": [
      "トウキョウドーム",
      "とうきょうどーむ"
    ],
    "eventVenueNames": [
      "東京ドーム"
    ],
    "eventVenueIds": [
      "tokyo-dome"
    ],
    "eventIds": [
      "5b31bf2835a0485e6cb3",
      "b26e0000462557bd141f",
      "54c0a94e922eec248085",
      "d8a1b2cab7a78937f2c7",
      "6a2095833aa62d3bf3c0",
      "62c8e6d71b2c0bf82ed3",
      "185bd5cf3f04a851f785",
      "5b19a419ac9b731f98c8",
      "8ed8e6b1b5810c48c8fa",
      "7d2fc9429e98a66c95a5",
      "dfef34e455e364f7b249",
      "52e3db7194df850c6318",
      "88d6d3d068e9e1c9fa29",
      "cadafd2f1f6441a2ff17",
      "434547dbeff31ec140c2",
      "svtn-tokyo-dome-20260614",
      "2471effe2b33b6713463",
      "fd881be7f19187e0a489",
      "91f2bfa90e65a0ac8058",
      "81d8aa6c569b5f992c05",
      "2b785f64a19ea75d51e4",
      "d16fe8b9d4f5e91d7ca3",
      "dece0a16371a38f7fc31",
      "4a6628f7f81074466307",
      "dd48ff0d981973cce1da",
      "fc4e925c909c1394d118",
      "539e94a295f9b6c1e0fb",
      "e487af9d66047dedde17",
      "e66f4a257d3161da59d0",
      "e8da621938bebcef7207",
      "b2b39e9899a66686fa2d",
      "8d58c9d559a7e4928a2a",
      "1cb62ee60e8d54da8f42",
      "474d4e7584278325fc6c",
      "5c4a3c4e48d83918b78e",
      "1ff658b7b175a222810e",
      "430f26f37d5787ddc0db",
      "03aacf8cc1a37097474f",
      "772de7d5a750e76ae94d",
      "ceede646cefd6ab221b6",
      "c0d032a0a9ade4daa34f",
      "141a026c7886884ca773",
      "53bd83835fdce3ff0637",
      "03a1a94fd6c2cab19cc2",
      "b52abced053ef33c7ad3",
      "15d75aefc8788cfd31ba",
      "d21d4d3fc1411af1e680",
      "2e01ba6e2e7116a192ea",
      "0a699726f5b189765129",
      "905d8c52e5fd65aa03e0",
      "87e0d67a005a580ebd2e",
      "7ad7f61e7df1350fb7cb",
      "09e5cc0f10e5d5147462",
      "f8f331bce26738922b5f",
      "217fc1c5404055a323eb",
      "266a1ab5f5614352e8d0",
      "17da36695dfee01abf86",
      "c272f48bb4a8c13d0256",
      "b1c070c75f873c950225",
      "88268d2799bfd920fd1b",
      "3e56c002b3336c6ac739",
      "62949e6cc52d6d78ada9",
      "4b53f9fb72e916996886",
      "b4e69eac15e2e5eb2e5e",
      "9eff90a055bb102776f1",
      "a4b38b80336baa7f514c",
      "c5f8d8ca615cc5c1b19b",
      "50f87c81ee1180004298",
      "46e760cb3d94a2cbd715",
      "8d9647b76dc016ac74b3",
      "7431a3be4c72011283ae",
      "646d1e1fc568eecf2cf9",
      "b2c80a57a3f6aba0e516",
      "8b0585427de2679bfd92",
      "6d34c588506d3d9308af",
      "5579f93c98386c83ccf6",
      "78e4f1741fea4677a067",
      "a434d0e5336611b04a8a",
      "94fe0e1298323ac54f5d",
      "6b9b9110a497a3b7fcb8",
      "66e5136563896070a0c7",
      "731ac93d2287227e7f7d",
      "198978abb3f11d6009f4",
      "833e01afcd13ee8de7ed"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "guideId": "tokyo-dome",
    "kind": "venue",
    "sourceUrls": [
      "https://www.tokyo-dome.co.jp/en/dome/event/schedule.html"
    ]
  },
  {
    "id": "kyocera-dome",
    "name": "京セラドーム大阪",
    "aliases": [
      "KYOCERA DOME OSAKA",
      "京セラドーム",
      "京セラ",
      "大阪ドーム",
      "キョウセラドームオオサカ",
      "キョウセラドーム",
      "オオサカドーム",
      "きょうせらどーむおおさか",
      "きょうせらどーむ",
      "おおさかどーむ"
    ],
    "eventVenueNames": [
      "京セラドーム大阪",
      "KYOCERA DOME OSAKA"
    ],
    "eventVenueIds": [
      "kyocera-dome",
      "official-news-70d4a6e99312853c"
    ],
    "eventIds": [
      "fdbdf91b272de74882b5",
      "fa14f0330492db8e452c",
      "b0b646dd6f293e73f6a9",
      "82cdeaadb4683d7b388a",
      "2817e89485110d5e235e",
      "93a9393fad32d9303aa6",
      "f7ea2cfb265fcae25299",
      "0b6236e077ad0841c21a",
      "88c34a19ae832ec6f02d",
      "610d1312c4e60016788d",
      "ac1052406ec79febd81c",
      "789af361e3da5e26c87c",
      "753bafde48806ffcf20f",
      "svtn-kyocera-20260810",
      "fb978027442e01713529",
      "294bb2c38e315da8fff2",
      "534bfee09568546049c4",
      "626bd4e3fb7899fd5cca",
      "a1f7b6d817c96a732216",
      "93dec1e9b401d54ac03e",
      "42f4c61d6af9abb78c60",
      "dcd8f91479e0d1a039f0",
      "e58428ec8d2134582c83",
      "e6cfccc75af3159fa2e6",
      "f0d18355052be8e4e126",
      "637b0ee284d09cc7ae47",
      "98e32afe6c25407585c2"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "guideId": "kyocera-dome",
    "kind": "venue",
    "sourceUrls": [
      "https://www.kyoceradome-osaka.jp/schedule/"
    ]
  },
  {
    "id": "vantelin-dome",
    "name": "バンテリンドームナゴヤ",
    "aliases": [
      "バンテリンドーム ナゴヤ",
      "バンテリンドーム",
      "名古屋ドーム",
      "ナゴヤドーム",
      "ばんてりんどーむなごや",
      "ばんてりんどーむ",
      "なごやどーむ"
    ],
    "eventVenueNames": [
      "バンテリンドームナゴヤ",
      "バンテリンドーム ナゴヤ"
    ],
    "eventVenueIds": [
      "vantelin-dome",
      "nagoya-dome"
    ],
    "eventIds": [
      "ff0f453430c1d6cce239",
      "17ffc26747b22c32491a",
      "svtn-nagoya-20260705",
      "de12503616aa1bedba16",
      "4bda367370231f37b117",
      "57234af2e5894996e741",
      "f2f56ad4d4446d5d3851",
      "05799e0bf630f2f18683",
      "ed73f36db87f01ee7268",
      "e89647c5339649ecaf3f",
      "5fd1e578c73321d69c09",
      "982fa9c417014b1f9b07",
      "4dd285b85092df43c289",
      "8fadd05e780f5256c423",
      "5b4622fe7aeba5c1c71f",
      "dd27cce55042dce7fbed",
      "375df8cbda131e6803ee",
      "853eeea8ae73a3d7a62a",
      "1cca97af1c4b7967ad71",
      "0370e18a4e1da8c8595b",
      "bab0e2e216e0c9f84662",
      "43ab3d2b5dab16a261a5",
      "f95ca25a84dbc9c55e72",
      "eda22a4aa575f6601156",
      "75d737d5ac9486c4e03b",
      "4c320825a0a7e5a006a2",
      "05e1c9b4f7a81d711e7d",
      "21068f0d74caac0f2c31"
    ],
    "prefecture": "愛知県",
    "region": "東海",
    "locality": "名古屋市",
    "guideId": "vantelin-dome",
    "kind": "venue",
    "sourceUrls": [
      "https://www.nagoya-dome.co.jp/sp/eventcalen.php",
      "https://www.nagoya-dome.co.jp/enjoy/access.php"
    ]
  },
  {
    "id": "paypay-dome",
    "name": "みずほPayPayドーム福岡",
    "aliases": [
      "福岡PayPayドーム",
      "PayPayドーム",
      "福岡ドーム",
      "ミズホペイペイドームフクオカ",
      "フクオカペイペイドーム",
      "ペイペイドーム",
      "フクオカドーム",
      "みずほぺいぺいどーむふくおか",
      "ふくおかぺいぺいどーむ",
      "ぺいぺいどーむ",
      "ふくおかどーむ"
    ],
    "eventVenueNames": [
      "みずほPayPayドーム福岡",
      "福岡PayPayドーム"
    ],
    "eventVenueIds": [
      "paypay-dome",
      "fukuoka-paypay-dome"
    ],
    "eventIds": [
      "3a1cb4e076132fb266a5",
      "3a3a33bd8a9ce66b7fd0",
      "372df89e65448216f393",
      "0432f25367746fa4607b",
      "0511b7bb1055359cefaf",
      "3bee3447e38940f4aa49",
      "e45993bd7468c5d7e48b",
      "0826d13a2e897aecff04",
      "f3e998868b64dde67bb5",
      "909fd216987232857eeb",
      "12abcad4eacd82b32b26",
      "830a68dd4715b7ac8207",
      "f3ceea98e096a8d0ad07",
      "e6c449d8eeaf6b9fb089",
      "589d36a4934c4686106b",
      "c254a075d1329f88d400",
      "2dbfadde0a1611f33dbf",
      "6e6c145f09d9e14f31df",
      "b167accf7f1c56331861",
      "svtn-fukuoka-20260905",
      "774ff055d0bd3b9701a2",
      "5f7397fcf539099e84cc",
      "8caf8d227a527d1ef3fe",
      "930e7a080fa2a871eb6b",
      "da816984d762e60a4702",
      "ec70dcd2f98ee4b83aeb",
      "07b312d140647de7dd44",
      "1a5048fa6a7e348c4ae2",
      "ac0f8afc73fedd1a4974",
      "bd11754c3657d5fec90d",
      "02a05fe50b5fca5a6b94",
      "8935a64b1062140a53d0",
      "1b4c5f7d9088fbada865",
      "f266d943a62a4b66290e"
    ],
    "prefecture": "福岡県",
    "region": "九州・沖縄",
    "locality": "福岡市",
    "guideId": "paypay-dome",
    "kind": "venue",
    "sourceUrls": [
      "https://www.softbankhawks.co.jp/stadium/event_schedule/2026/"
    ]
  },
  {
    "id": "sapporo-dome",
    "name": "大和ハウス プレミストドーム（札幌ドーム）",
    "aliases": [
      "札幌ドーム",
      "大和ハウス プレミストドーム",
      "プレミストドーム",
      "サッポロドーム",
      "ダイワハウスプレミストドーム",
      "ぷれみすとどーむ",
      "さっぽろどーむ",
      "だいわはうすぷれみすとどーむ"
    ],
    "eventVenueNames": [
      "札幌ドーム"
    ],
    "eventVenueIds": [
      "sapporo-dome"
    ],
    "eventIds": [
      "e9d295d474d4486df5a7",
      "8cd682bb6019c7b848fb",
      "c2f5179c61c44f46fb0a",
      "3c08a007d643f080d865",
      "3361b325661319597495",
      "c11bd7b092ece9f7f455",
      "2e0aedcd0daad94abd47",
      "7c09aca025f726d47b01",
      "bc9a6685c3a32b695b24",
      "f4376453ed4005cde39b",
      "1596874bb41993209479",
      "126f8954bd6a5a64d5ec",
      "52a4927231b268c52cc6"
    ],
    "prefecture": "北海道",
    "region": "北海道・東北",
    "locality": "札幌市",
    "guideId": "sapporo-dome",
    "kind": "venue",
    "sourceUrls": [
      "https://www.sapporo-dome.co.jp/schedule/",
      "https://www.sapporo-dome.co.jp/access/subway/"
    ]
  },
  {
    "id": "belluna-dome",
    "name": "ベルーナドーム",
    "aliases": [
      "西武ドーム",
      "ベルーナ",
      "セイブドーム",
      "べるーなどーむ",
      "べるーな",
      "せいぶどーむ"
    ],
    "eventVenueNames": [
      "ベルーナドーム"
    ],
    "eventVenueIds": [
      "belluna-dome"
    ],
    "eventIds": [
      "2da7e91d2f9e667810a9",
      "c3fbfe5c483db196d07d",
      "943e4f3c4bde3046f947",
      "31a66b30d18abd8841dd",
      "a26a61a79615c0df99c8",
      "859741f797acc08b62b8",
      "6c386baf5f8d37956248",
      "1473d10abfd2f7074bf7",
      "f0a140cc1c3030f45953",
      "e7bab65d0a944f1c87a0",
      "a5801e03f2ca5610c142",
      "85b4793e8faffb78fbe1"
    ],
    "prefecture": "埼玉県",
    "region": "関東",
    "locality": "所沢市",
    "guideId": "belluna-dome",
    "kind": "venue",
    "sourceUrls": [
      "https://bellunadome.seibulions.co.jp/schedule/"
    ]
  },
  {
    "id": "zozo-marine",
    "name": "ZOZOマリンスタジアム",
    "aliases": [
      "ZOZOマリン",
      "マリンスタジアム",
      "ゾゾマリンスタジアム",
      "ゾゾマリン",
      "まりんすたじあむ",
      "ぞぞまりんすたじあむ",
      "ぞぞまりん"
    ],
    "eventVenueNames": [
      "ZOZOマリンスタジアム"
    ],
    "eventVenueIds": [
      "zozo-marine"
    ],
    "eventIds": [
      "812713f1672046853bf1",
      "ba40bec99b837bb95049",
      "004b0222a322cf26f699",
      "8398c069dcbb0e09622d",
      "4bbf82956db06d64a82a",
      "08b7d2ab05e199aa87cb",
      "0de4144b780c438b4c5b",
      "ef1da1370f012add8c00",
      "3a6845f4125768a32a32",
      "2049eda89234bfd25fbc",
      "e642fb47dae93433816a",
      "e258281992a9050ab321",
      "0fe95fc09ebbd1b0df7c",
      "f6d1d32e59ec93967700",
      "799829e7f93d7c0cd517",
      "fa249fca8a2e8649257a",
      "844bdc4b884055a9bd7e"
    ],
    "prefecture": "千葉県",
    "region": "関東",
    "locality": "千葉市",
    "guideId": "zozo-marine",
    "kind": "venue",
    "sourceUrls": [
      "https://www.marines.co.jp/stadium/schedule/"
    ]
  },
  {
    "id": "koshien",
    "name": "阪神甲子園球場",
    "aliases": [
      "甲子園球場",
      "甲子園",
      "ハンシンコウシエンキュウジョウ",
      "コウシエンキュウジョウ",
      "コウシエン",
      "はんしんこうしえんきゅうじょう",
      "こうしえんきゅうじょう",
      "こうしえん"
    ],
    "eventVenueNames": [
      "阪神甲子園球場"
    ],
    "eventVenueIds": [
      "koshien"
    ],
    "eventIds": [
      "becf8715615261202b45",
      "4ca566795cebae4a1582",
      "1606248e82de88d1beb5",
      "7635940ca6900d7f681e"
    ],
    "prefecture": "兵庫県",
    "region": "関西",
    "locality": "西宮市",
    "guideId": "koshien",
    "kind": "venue",
    "sourceUrls": [
      "https://koshien.hanshin.co.jp/event/202611.html"
    ]
  },
  {
    "id": "mufg-stadium",
    "name": "MUFGスタジアム（国立競技場）",
    "aliases": [
      "MUFGスタジアム",
      "国立競技場",
      "コクリツキョウギジョウ",
      "エムユーエフジースタジアム",
      "こくりつきょうぎじょう",
      "えむゆーえふじーすたじあむ"
    ],
    "eventVenueNames": [
      "MUFGスタジアム"
    ],
    "eventVenueIds": [
      "mufg-stadium"
    ],
    "eventIds": [
      "4ac9ef38e6238d6bb17b",
      "9e43987552cc99637e04",
      "1d397077d8b1258ce5c3",
      "f11fe70c77c0e7a025eb",
      "9851e1106d5861bbe8ae",
      "8c4c19e184fc25843b6f",
      "dfa8e0c147073bf983cb",
      "82291e3b2bb30babd60e"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "guideId": "mufg-stadium",
    "kind": "venue",
    "sourceUrls": [
      "https://jns-e.com/event/page/202611/"
    ]
  },
  {
    "id": "nissan-stadium",
    "name": "日産スタジアム",
    "aliases": [
      "ニッサンスタジアム",
      "にっさんすたじあむ"
    ],
    "eventVenueNames": [
      "日産スタジアム"
    ],
    "eventVenueIds": [
      "nissan-stadium"
    ],
    "eventIds": [
      "9e4366f7cb9370b766e4",
      "56f456ff35f245f6d4c6",
      "420d0fab65cae154101a",
      "cc899909a2c9faa00d84"
    ],
    "prefecture": "神奈川県",
    "region": "関東",
    "locality": "横浜市",
    "guideId": "nissan-stadium",
    "kind": "venue",
    "sourceUrls": [
      "https://www.nissan-stadium.jp/calendar/",
      "https://www.nissan-stadium.jp/access/train.php"
    ]
  },
  {
    "id": "saitama-super-arena",
    "name": "さいたまスーパーアリーナ",
    "aliases": [
      "埼玉スーパーアリーナ",
      "さいたまアリーナ",
      "たまアリ",
      "SSA",
      "サイタマスーパーアリーナ",
      "サイタマアリーナ",
      "タマアリ",
      "さいたますーぱーありーな",
      "さいたまありーな",
      "たまあり"
    ],
    "eventVenueNames": [
      "さいたまスーパーアリーナ",
      "埼玉スーパーアリーナ"
    ],
    "eventVenueIds": [
      "saitama-super-arena",
      "saitama-arena"
    ],
    "eventIds": [
      "svtn-saitama-20250315",
      "6b656d32c80f25d4b200",
      "57ed221b1068233c2457",
      "ad9d7f760d642682a1e7",
      "c72284749924925dd92a",
      "aca7cb4e0f4f83a0b72a",
      "ef6a96db09b7f5b4b74a",
      "35955fdd0bc090cafe7d",
      "8eee42129648145d21e3",
      "8a3c8ec41dae89ddcfaf",
      "111fa9f90850b7bf176d",
      "d3ae14a6be8d64920a2f",
      "02af13a44c3cec2a95e6",
      "54b70a93ec00fa5feea7",
      "990b1104913c7c1e9aa8",
      "82e48361e38cba8144db",
      "8c41bec76ca05f592751",
      "65226fefda0bc6d801bc",
      "024abe57ab8bba7074bd",
      "10edd42b12bd7f56b5a8",
      "9aaf284b3548cde74886",
      "bb393ef036809c76adf4",
      "d0da5de36770fdfcabb7",
      "7de692572c7847ed7d7b",
      "398045a8d8d5c2524e99",
      "4ba1879e74f8ca7e5fc6",
      "ff7a04b6ee4f7f4bd0a8",
      "e0f8773769544f273cb0",
      "3feec1c19c04e674b02e"
    ],
    "prefecture": "埼玉県",
    "region": "関東",
    "locality": "さいたま市",
    "guideId": "saitama-super-arena",
    "kind": "venue",
    "sourceUrls": [
      "https://www.saitama-arena.co.jp/schedule/"
    ]
  },
  {
    "id": "yokohama-arena",
    "name": "横浜アリーナ",
    "aliases": [
      "横アリ",
      "ヨコハマアリーナ",
      "ヨコアリ",
      "よこはまありーな",
      "よこあり"
    ],
    "eventVenueNames": [
      "横浜アリーナ"
    ],
    "eventVenueIds": [
      "yokohama-arena"
    ],
    "eventIds": [
      "15fb5c32dae46e6e0897",
      "690435f6ee69fdc37f2a",
      "8e34b94de50615b95e84",
      "3b02a77e32d717a558fe",
      "dc20df93257ebec7fc4d",
      "380f356c7999a458931d",
      "fca58138128a0a0f2f4c",
      "a2b605ba871f42012085",
      "7bcc55a45f563c72c91c",
      "6a49bcd07f9f3a38182a",
      "64c92b2b3ca859b0e443",
      "78bc4ac9b60017edaae8",
      "a94083133c79b68a4dc8",
      "e2c664fe49774b6372e7",
      "fe58c18eb85972134f54",
      "579f526b4f9c7f2a1056",
      "a6d9ffa04e231ae96f37",
      "1a1479899da499d33f6a",
      "8917abe7922e67759216",
      "d3a50fdba20850c0eae4"
    ],
    "prefecture": "神奈川県",
    "region": "関東",
    "locality": "横浜市",
    "guideId": "yokohama-arena",
    "kind": "venue",
    "sourceUrls": [
      "https://www.yokohama-arena.co.jp/event",
      "https://www.yokohama-arena.co.jp/access/"
    ]
  },
  {
    "id": "pia-arena-mm",
    "name": "ぴあアリーナMM",
    "aliases": [
      "ぴあアリーナ",
      "ピアアリーナエムエム",
      "ピアアリーナ",
      "ぴあありーな",
      "ぴあありーなえむえむ"
    ],
    "eventVenueNames": [
      "ぴあアリーナMM"
    ],
    "eventVenueIds": [
      "pia-arena-mm"
    ],
    "eventIds": [
      "0d373c92991fc5a09750",
      "d566c11b953e0957b4b6",
      "df137e8b544fa614e13e",
      "a580e2b95d165726cd9d",
      "55caba917dd7617810d0",
      "8b06f63b44723abc4c68",
      "21e9e47697dc9afea888",
      "29367955f5674fa08f1b",
      "42ba9214a7b6b7d33a2d",
      "7bd216eff58947b79bc8",
      "56af9313d217600ac185",
      "460fac015a2e97212f17",
      "ac2c0a1f092e9de1e28f",
      "6f7f53f6088e62dd0c25",
      "7a72da6b0b70bfb9e0c4",
      "9470236979d273b525f9",
      "3305aabef7e6188cbeab",
      "4c383b05bbb05af983df",
      "5b054f66c2300770736d",
      "5f20d74b6641a6530716",
      "8fea9158b57344b11141",
      "efdaa7a66356bc61d0e6",
      "22c5d48cba6e12345ea2"
    ],
    "prefecture": "神奈川県",
    "region": "関東",
    "locality": "横浜市",
    "guideId": "pia-arena-mm",
    "kind": "venue",
    "sourceUrls": [
      "https://pia-arena-mm.jp/",
      "https://pia-arena-mm.jp/access/index.html"
    ]
  },
  {
    "id": "ariake-arena",
    "name": "有明アリーナ",
    "aliases": [
      "アリアケアリーナ",
      "ありあけありーな"
    ],
    "eventVenueNames": [
      "有明アリーナ"
    ],
    "eventVenueIds": [
      "ariake-arena"
    ],
    "eventIds": [
      "062c901a562147eaaf24",
      "ccaef9e9229e46465813",
      "476ff3f9af1465da63f7",
      "511b909b443bfa7d097a",
      "7cb0fa1b2303b31f51d2",
      "d9f1fb278615d9a5adca",
      "ba9947880bf903c7a3a6",
      "2dafce0cd323b7910959",
      "694993d59beb2bdf6416",
      "29f9aa444c85858d3cf7",
      "72788aa6e37aed291f25",
      "4669b2070199085a7f8a",
      "e958a40bc8cddf3cb9dc",
      "7dda9bb2a6e525e7d3de",
      "cbd7126e0bc31e11d975",
      "23e5ac8f60dbcf111761",
      "9530ea3d5d4f0a31b45c",
      "d3a4da67307b62a99e27",
      "27705a4283e8ff48ff43",
      "81b10eea775775409167",
      "9c06cffdb8994c0a4bb9",
      "c18753310fabd132d434",
      "10f224119f9c5a9affc1",
      "fab6a3f611e80c3dde0e",
      "c95f48de1b3caa3fc792",
      "773532f1d20e170dd97a",
      "c3bc3a494b831c04d003",
      "ea9083fba663f311dd1a",
      "26711242c057f1882930",
      "a67cf7f92240e89602a3",
      "42fc3c7209cbe109a0b5",
      "fcdbadf5a2abbfa60cba",
      "1c53212c32db2dc8b482",
      "8e3a22a671223f99ca72",
      "3e54372fd155b28d23bc",
      "eb9202c764d37051a740",
      "abed7e8d055a8de80270",
      "48f562da18ef20e0e8d5",
      "e461bb6d1e01d6d19715",
      "43e94ba852ac46fcc4fb",
      "a0129e958c01fc9384d1",
      "f4fa7c078322ecf1a135",
      "061b1af32b3accebced7",
      "9b26c9b3aef538ae8438",
      "a54375544ea0375ae2ae",
      "8668dfaf0e861b7e8c85",
      "c233a3be0d925e515f5f",
      "f9026a573b159c896194",
      "b74adce629bb419886ab",
      "979e628d7c8affa3ee93",
      "f5f224dec78bc57dc1af",
      "dc339f1e07c421b02971",
      "b6bcf1091b0556167c82",
      "2a8d82dbb1cbd1037267",
      "eca1e81a403b9de50d93",
      "ddd5dcff9575e6feb929",
      "9399975e25ea595a9300",
      "27320b32b3715d677c89",
      "e92b4e291328d97a8dda",
      "7411bc6895b6f6888123",
      "10985bdfc08d60efd99c"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "guideId": "ariake-arena",
    "kind": "venue",
    "sourceUrls": [
      "https://ariake-arena.tokyo/event/"
    ]
  },
  {
    "id": "budokan",
    "name": "日本武道館",
    "aliases": [
      "武道館",
      "ニッポンブドウカン",
      "ニホンブドウカン",
      "ブドウカン",
      "にっぽんぶどうかん",
      "にほんぶどうかん",
      "ぶどうかん"
    ],
    "eventVenueNames": [
      "日本武道館"
    ],
    "eventVenueIds": [
      "budokan"
    ],
    "eventIds": [
      "28358ae5a4998874744f",
      "7c65df80dbe4e8a47a82",
      "a82bbc0b8160c4cf8437",
      "b438cc45498d9c016421",
      "c1e155b5d6daee914ea1"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "guideId": "budokan",
    "kind": "venue",
    "sourceUrls": [
      "https://www.nipponbudokan.or.jp/about/access"
    ]
  },
  {
    "id": "yoyogi",
    "name": "代々木第一体育館",
    "aliases": [
      "代々木体育館",
      "代々木第一",
      "国立代々木競技場 第一体育館",
      "ヨヨギダイイチタイイクカン",
      "ヨヨギタイイクカン",
      "ヨヨギダイイチ",
      "よよぎだいいちたいいくかん",
      "よよぎたいいくかん",
      "よよぎだいいち"
    ],
    "eventVenueNames": [
      "代々木体育館",
      "代々木第一体育館"
    ],
    "eventVenueIds": [
      "yoyogi"
    ],
    "eventIds": [
      "84dbe953564330fb72da",
      "e06178e031ef55cf2f69",
      "038178d39dcf82bd4f0e",
      "8accf7866ce883465036",
      "abcb88e4af1d45551525",
      "931ba4190057a0e3603b",
      "1fe3642dfb57c1b0952e",
      "22b4667ed8edfd879f18",
      "6fc9298d30e823a1ca60",
      "0effc82226e819e4bc88",
      "10bb7b61efc1a0014ed0",
      "9e9036ca2c545d88516b",
      "f47843ea8847bec16505",
      "16157b1a274434f5fe10"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "guideId": "yoyogi",
    "kind": "venue",
    "sourceUrls": [
      "https://www.jpnsport.go.jp/yoyogi/event/tabid/59/default.aspx"
    ]
  },
  {
    "id": "makuhari-messe",
    "name": "幕張メッセ",
    "aliases": [
      "マクハリメッセ",
      "まくはりめっせ"
    ],
    "eventVenueNames": [
      "幕張メッセ"
    ],
    "eventVenueIds": [
      "makuhari-messe"
    ],
    "eventIds": [
      "1ebd1044ba7a8ef9366c",
      "c4984efbaaf745b55917",
      "07b67981b7c2a8a3b5df",
      "731b731eacce4c94b500",
      "0bf2f3ca9f60cabf7f7a",
      "c8f24432f4c0a46e3cb0",
      "010028004484106cad6f",
      "5bbcdf08cfde1a435d92",
      "9e633d37fabb54832849",
      "3816dc56c1deb2f1f7dd",
      "9b048f3b4492741cd8a0",
      "f482a326cb4ff942e2fa",
      "95430c4b8a316076d5ff",
      "533ef9eda2349538ee60",
      "73295988b62af808b067",
      "23c8d5677e19a8f79d42",
      "0ff48d2fb60e08bf5662",
      "5818c08b43a71ffdcba7",
      "3b020ba807776c2d4dd4",
      "79a5937c9690c520a2f2",
      "9e0fba2f141cde2edc74"
    ],
    "prefecture": "千葉県",
    "region": "関東",
    "locality": "千葉市",
    "guideId": "makuhari-messe",
    "kind": "venue",
    "sourceUrls": [
      "https://www.m-messe.co.jp/event/"
    ]
  },
  {
    "id": "k-arena",
    "name": "Kアリーナ横浜",
    "aliases": [
      "Kアリーナ",
      "ケーアリーナ横浜",
      "ケーアリーナヨコハマ",
      "ケーアリーナ",
      "けーありーなよこはま",
      "けーありーな"
    ],
    "eventVenueNames": [
      "Kアリーナ横浜"
    ],
    "eventVenueIds": [
      "k-arena"
    ],
    "eventIds": [
      "fd9841bb877225708bb5",
      "45f29bb344abdb41e581",
      "d92c732962ae3c066be7",
      "a786a96c39a2ead86d29",
      "bd67e265f7cff2448c9a",
      "344043f3db47ef66c3f5",
      "a9b171b8e22595e13695",
      "8d0027b9440cfd778acd",
      "bba60c4a660ba0abf3e4",
      "69fab4dfd1b48c88c5d6",
      "47ed15bc2883b0f74be8",
      "15eee60ffc1fe6b4fcfa",
      "4d5556bc74a4b5f57313",
      "028484aabcd1b2f1f16e",
      "0d3deee7c96340708368",
      "f2ffc1b8aea111c42df6",
      "3f193a0987726c7326a2",
      "13b27663c88e55ec9143",
      "24401e7aa48e6496ebee",
      "4ab741662ad7995d70b8",
      "703b5cdb5f9f52e25b4c",
      "efec95576acbb1e86d94",
      "a23ca24b3d234fed2965",
      "da2f222bb4643204956f",
      "ce0c3a048eb432950bd5",
      "5e1bc87f9a355c4fa4e8",
      "17094d58599cf41de2c5",
      "6410d66a2a2881f6b10e",
      "cac2039601450d89ff78",
      "2f46f1a30b26c05ca8b0",
      "bc4cc64e1eb188078d2e",
      "5491b335d1c23360afd8",
      "cf1d385b52e5b49dcf7a",
      "42df0f4030d3e72a91a0",
      "090f423a5192de9ddf03",
      "03801961cdfbaa0f3544",
      "263bd98e76ca7aaf6da8",
      "a7cada14d175d7563e7c",
      "cd19f4bde17013249987",
      "f1de2bbf96f00365503c",
      "da506f226393aed16aab",
      "5dfdc19174f3cb973dfd",
      "f0dcbf30a284c0524cf7",
      "9e99255c5a4ef99e5a96",
      "0dfddf131dd8ebb857be",
      "30f05dfac68eecbada77",
      "f0a2e0bb3555f88f2f48",
      "625c6aa823ef894edbb1",
      "3f0325e498af0858693c",
      "5b1794d94293050f3b76",
      "e2ac7d55913f60678205",
      "9aa15a8dbacd7e21f864",
      "b442f710a2454807afb4",
      "f1cf5927847b32ea92c9",
      "d2c08f88b4f7dde9f1d8",
      "eca77d2ecac3194f502b",
      "24f8057ccb884b4b96c2",
      "52654faff37f30e419cd",
      "2fb56bd774f6994847e5",
      "23bbb7eec7b77b86e79c",
      "e4e502beef4bde894aa5",
      "ab90e46d1d8128b36424"
    ],
    "prefecture": "神奈川県",
    "region": "関東",
    "locality": "横浜市",
    "guideId": "k-arena",
    "kind": "venue",
    "sourceUrls": [
      "https://k-arena.com/en/schedule/",
      "https://k-arena.com/access/"
    ]
  },
  {
    "id": "tokyo-garden-theater",
    "name": "東京ガーデンシアター",
    "aliases": [
      "トウキョウガーデンシアター",
      "ガーデンシアター",
      "とうきょうがーでんしあたー",
      "がーでんしあたー"
    ],
    "eventVenueNames": [
      "東京ガーデンシアター"
    ],
    "eventVenueIds": [
      "tokyo-garden-theater"
    ],
    "eventIds": [
      "37d96a2c9a6bdcc157cd",
      "0a3c7ac5e8033cc7fcae",
      "6bbab687cd27428fbd0a",
      "deb12a1fb764d0b49bd4",
      "10693028f42852876cc5",
      "892c6a992a1451d2dbf8",
      "8a12297f727e94ac1476",
      "c100f595c13e9da32a33",
      "0d23cde405a26f5b7dd7",
      "20473800bb7492916078",
      "a29f1a066d79711f114a",
      "0f24bde862331bc10f3e",
      "2601b4f894de68a3e72f",
      "ea0f3c12ffc69ca8af81",
      "4de5c6bbbee1d34f578d",
      "c5bcbc03c8d23530ef2a",
      "40ccea7b4fdd62e7121f",
      "880be1b225e543b886e4",
      "cb1bd91fbc35115df1c0",
      "046199ba54733b3b8f46",
      "950c4603213de5a9d3f1",
      "6f5f9e66063283d0f9b6",
      "ae88554fd515d3885311",
      "45fc2b8e68f9f987e5be",
      "058fce8467d58b8b6bb6",
      "c7ae05e9f45cebdf22a8",
      "ee2ed4653a4ed25df781",
      "040774a9d1e55b05c7b3",
      "96f1f83dff5563794c65",
      "a739946070f893b334a0",
      "f2b2e9a8a462f29aeb51",
      "fd3f2f7b6e4455d747b2",
      "b218581e0b00fdfbcc95",
      "b809a33d13a2cdb0496c",
      "52f06a8fcad87595c096",
      "12fc64089e9ae42088e6",
      "95ebed040cbb9e7c0696",
      "6f08b9ac18abb428b293",
      "d0776c74c0534c4be18c",
      "0907f9bcd27f9b7f24e3",
      "154dc948d1cd897bd7b0",
      "83fbecca1e27900c618f",
      "8b387db3de43eb36556c",
      "b25ff9aebb4300f53416",
      "1a90e30b86e302256a98",
      "7933e3e58fca5375209d",
      "e0b85ade2dc108603ef3",
      "c18ffe271de95fec0ccc",
      "f25786cd91af1bfcf81a",
      "6a8c45e0d552b7c56c25",
      "065e7701683da50db0f5",
      "61f968eceb31db038c87",
      "84dcbacd93ac721f23a5",
      "de774cadf0ea88d0ce00",
      "12527b468dbe89c66095",
      "173324a408e2075f5030",
      "7470edca88728d5ba040",
      "395c513bac8568e29db1",
      "e2f0bfe6af32b06b9d1d",
      "51c6ceb514371470096f",
      "d2ae5a9e8a490c772d0f",
      "8aac213153f3209abf67",
      "ddc4ff8b65e43da66210",
      "17d312f257e80eea69ff",
      "f933ddf4dedfd39f7067",
      "ce18e267f5fb572f4575",
      "f2376ad9c3955e9b9e4c",
      "c083a792ea36496928d4",
      "8cf1c13ab109c8e3925f",
      "9e058b99d388dc1ff3c4",
      "5abb72f4d9a660b92793",
      "156567e4076c8dbed104",
      "01ca688ab53a018fae21",
      "1ac00f12e85b5ebba0cf",
      "d4e82d0843d2dfbcad25",
      "b6f2772d1b79d338a5a3",
      "83ff3df0b43d3c0c842c",
      "186503d8afecf0d54dc5",
      "bb62bc6f027a69959ad6",
      "2ad6fe0e843fb21299c8",
      "5be20d1b7502ccd46101",
      "d77d84b8e6f30de77c7b",
      "3ce8c63a89f4bd5f105b",
      "01405fddc7b008b676cf",
      "6d220f4e037bc5a71045",
      "a95c61522e173c70092d",
      "e72eb6fa4a3d7b8daed3",
      "915796eb3a26a423d6ec",
      "fbafb03aecc4c3cedd70",
      "3404fd1372c4db404e57",
      "5d7aa3d2ecd0f2cc11fb",
      "26c0db9347eee039fda6",
      "913e9bbfb4a325f6b23f",
      "1bfabf54c5d070dc4dbf",
      "e4ed985ebbb11ed26663",
      "72baf4f3c4c20b42f923",
      "e0aee3345aeae965b252"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "guideId": "tokyo-garden-theater",
    "kind": "venue",
    "sourceUrls": [
      "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/schedule/?date=2026-11"
    ]
  },
  {
    "id": "osaka-jo-hall",
    "name": "大阪城ホール",
    "aliases": [
      "城ホ",
      "オオサカジョウホール",
      "ジョウホ",
      "おおさかじょうほーる",
      "じょうほ"
    ],
    "eventVenueNames": [
      "大阪城ホール"
    ],
    "eventVenueIds": [
      "osaka-jo-hall"
    ],
    "eventIds": [
      "svtn-osaka-jo-20241205",
      "bf12baeac8a5c089fc87",
      "be6817b012ef5f7f2bff",
      "a679b643b45dce18cf3d",
      "36f699d4dfbbfa736b39",
      "2fc6017b43dde9053f15",
      "318e8bcb8c85fe5c22c9",
      "55c5038e5c51546baaee",
      "b3bda45dd52a2c550f9e",
      "bbc59e329773cbd342cf",
      "10faa721380780e72216",
      "a661ff3e9c97ef427322",
      "a69f19427a56808aedc5",
      "32631ea46507e9717e87",
      "40cdc49bdba9539f7b48",
      "00bba15441428a5f1f56",
      "c2e442f8d070c05bcb93",
      "e361f2646af0abd80349",
      "b98fff65f61145db6f8a",
      "2902075561b94b3127b9",
      "443ecc9fa658d76e05a7",
      "65728c28f5f2e5001989",
      "055c19b25b9ab0bb5ef9",
      "a1e9ca8bd66391cbe8eb",
      "580a7bdd6fe0834322ae",
      "f37c75bf0f64a7ec6a07",
      "f9848045f51ad76f0b44",
      "05f57b6dd1976edf99f0",
      "db48143d83e5c5714103",
      "46cae86916af84b84ae2",
      "68ec14cb2b5558f823b1",
      "80af519c06caef2ef7f8",
      "45a506c8fde1e86e971a",
      "6cb527d0a55b469299e9",
      "5efe235274b32a4fa511",
      "fd834213d8c147fcc24b",
      "eb934a68fed8d3fa1d53",
      "79e7095ec5c768418250",
      "2b6e08e71053bb8011ad",
      "6f9268ad025074ac6f66",
      "c0055c895856e96c336b",
      "c22108560a29d7bb55ef",
      "49b1b6dc4360a7ec1ed3",
      "eaa04b5e819defa6b9d2",
      "ccf55e91250f3507e2bd",
      "623c6cbc924e21ffe44c",
      "9f5774a247c8d43371b5",
      "67f36ecccab0ca7f83e8",
      "1f7324790edd75e0be7c",
      "ec5abc0681309a3ca2a6",
      "45b3f61a1a4f58617193",
      "e16329fabf4844fa1d5f",
      "d9a61afff5566bd84f5b",
      "a605afc369ef0e1130b8",
      "d0f32fd365764df6683f",
      "1a0c20876e0a1e6faa35",
      "633f5315276f3c9d959f",
      "f1c4827a31b706f1de43",
      "cdd1b96d2720147593c2",
      "0bedaf9027a5d511588f",
      "6a9387fc8dd18feb32ea",
      "5687abc030fc14c98036",
      "3adb4ed2e6ab9dfee545",
      "37bb482cb623783ca738",
      "0485452ccca1ed57b9e7",
      "fd5f1ac5866e7e70de05",
      "e870163be352373eea31",
      "8a0937e4c4a7c79e6e2b",
      "99a12fdc6c9d4a396ce8",
      "574f65e601c78b07b333",
      "cdd0a7f3fc8e62649249"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "guideId": "osaka-jo-hall",
    "kind": "venue",
    "sourceUrls": [
      "https://www.osaka-johall.com/event/"
    ]
  },
  {
    "id": "edion-arena",
    "name": "エディオンアリーナ大阪",
    "aliases": [
      "大阪エディオンアリーナ",
      "大阪府立体育会館",
      "エディオンアリーナオオサカ",
      "オオサカエディオンアリーナ",
      "オオサカフリツタイイクカイカン",
      "えでぃおんありーなおおさか",
      "おおさかえでぃおんありーな",
      "おおさかふりつたいいくかいかん"
    ],
    "eventVenueNames": [],
    "eventVenueIds": [
      "edion-arena"
    ],
    "eventIds": [],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "guideId": "edion-arena",
    "kind": "venue",
    "sourceUrls": [
      "https://www.furitutaiikukaikan.ne.jp/access.php"
    ]
  },
  {
    "id": "marine-messe",
    "name": "マリンメッセ福岡A館",
    "aliases": [
      "マリンメッセ福岡",
      "マリンメッセ",
      "マリンメッセフクオカ",
      "マリンメッセフクオカエーカン",
      "まりんめっせ",
      "まりんめっせふくおか",
      "まりんめっせふくおかえーかん"
    ],
    "eventVenueNames": [
      "マリンメッセ福岡",
      "マリンメッセ福岡A館"
    ],
    "eventVenueIds": [
      "marine-messe"
    ],
    "eventIds": [
      "12db5ae9aa2de50bf478",
      "ee344afc608092eb2d49",
      "48daf840ce4ce0772f96",
      "619b4d6cb6dbae23608d",
      "1e6081a3f85e6579dc34",
      "470f471dcaf4f0b3384c"
    ],
    "prefecture": "福岡県",
    "region": "九州・沖縄",
    "locality": "福岡市",
    "guideId": "marine-messe",
    "kind": "venue",
    "sourceUrls": [
      "https://www.marinemesse.or.jp/messe/event"
    ]
  },
  {
    "id": "miyagi-arena",
    "name": "セキスイハイムスーパーアリーナ",
    "aliases": [
      "宮城スーパーアリーナ",
      "宮城セキスイハイムスーパーアリーナ",
      "グランディ21",
      "ミヤギスーパーアリーナ",
      "ミヤギセキスイハイムスーパーアリーナ",
      "せきすいはいむすーぱーありーな",
      "ぐらんでぃ21",
      "みやぎすーぱーありーな",
      "みやぎせきすいはいむすーぱーありーな"
    ],
    "eventVenueNames": [
      "セキスイハイムスーパーアリーナ"
    ],
    "eventVenueIds": [
      "miyagi-arena"
    ],
    "eventIds": [
      "4d4856ffb7c0ceb9f928",
      "59c744a4ffe2ea102bad",
      "a3bf01b0d2684ee88fc9",
      "73cbd48fe6ba2e36ebd6",
      "cb42f5d22090b4aa0108",
      "76816cc1d61bfdd3a16e",
      "7e9f43b9fd55419d1164",
      "d64a82842535117e56f7",
      "c92b6132194c540acaf8",
      "19811ae4d6dc1c09f162",
      "3f4fd7ccc103612a7dbc",
      "f6000579a705ccc52dcd",
      "a40ad3cd21027457d3f3",
      "1a87207a59a3ba7144fd",
      "25e1fca76cf53dcf20de",
      "cc7cd14cb65cbe20e862",
      "1d32def2b1223fdb9e86",
      "43a64dc7cba504209ec8",
      "09a88393adcb0e99c489",
      "a7a2a2103d51c04f427c",
      "021d6746626df0fd378c",
      "3f6e3b0bb556aebf8594",
      "3208e2bcb0925ad391a4",
      "98d5c7024642e12ead6a",
      "6b147f14630e164f3369",
      "8a8cf7d20d27de9e9bef",
      "7e6b61e54beff5222a34",
      "8a78806499c1d6aa4dc4",
      "94b948244f226119cd05",
      "a4925c491ff1a361a9b0",
      "1b4f130863868f061189",
      "b3d77d46f36553c66104",
      "17cc060ebc78d8d47549"
    ],
    "prefecture": "宮城県",
    "region": "北海道・東北",
    "locality": "宮城郡利府町",
    "guideId": "miyagi-arena",
    "kind": "venue",
    "sourceUrls": [
      "https://www.mspf.jp/grande21/"
    ]
  },
  {
    "id": "hiroshima-arena",
    "name": "広島グリーンアリーナ",
    "aliases": [
      "広島アリーナ",
      "ヒロシマグリーンアリーナ",
      "ヒロシマアリーナ",
      "ひろしまぐりーんありーな",
      "ひろしまありーな"
    ],
    "eventVenueNames": [
      "広島グリーンアリーナ"
    ],
    "eventVenueIds": [
      "hiroshima-arena"
    ],
    "eventIds": [
      "14cc62abe3d716f02762",
      "ef2a0aa91f5cbc1b49bc",
      "039a7cc2711ea0b2f213",
      "b8cae8b91c6d4acfcef6",
      "0603cf6126eb506bae0f",
      "95457aaf43259bf1b096"
    ],
    "prefecture": "広島県",
    "region": "中国",
    "locality": "広島市",
    "guideId": "hiroshima-arena",
    "kind": "venue",
    "sourceUrls": [
      "https://h-jigyoudan.or.jp/sports-center/center-events/"
    ]
  },
  {
    "id": "gaishi-hall",
    "name": "クロコくんホール（旧日本ガイシホール）",
    "aliases": [
      "名古屋ガイシホール",
      "クロコくんホール",
      "日本ガイシホール",
      "ガイシホール",
      "クロコクンホール",
      "ニホンガイシホール",
      "ナゴヤガイシホール",
      "くろこくんほーる",
      "がいしほーる",
      "にほんがいしほーる",
      "なごやがいしほーる"
    ],
    "eventVenueNames": [
      "名古屋ガイシホール",
      "クロコくんホール"
    ],
    "eventVenueIds": [
      "gaishi-hall",
      "official-news-3fc6d4149f0ccd10"
    ],
    "eventIds": [
      "b07eac2de1591fb712b5",
      "aa1088607becce201951",
      "7d6b525ed3284dc0d315"
    ],
    "prefecture": "愛知県",
    "region": "東海",
    "locality": "名古屋市",
    "guideId": "gaishi-hall",
    "kind": "venue",
    "sourceUrls": [
      "https://www.nespa.or.jp/hall/",
      "https://www.nespa.or.jp/sports-plaza/hall/access/"
    ]
  },
  {
    "id": "toki-messe",
    "name": "朱鷺メッセ",
    "aliases": [
      "トキメッセ",
      "ときめっせ"
    ],
    "eventVenueNames": [
      "朱鷺メッセ"
    ],
    "eventVenueIds": [
      "toki-messe"
    ],
    "eventIds": [
      "1c4298a4a0bc4ce7f7b5",
      "a07400cec3b7edfb76ea"
    ],
    "prefecture": "新潟県",
    "region": "北陸・甲信越",
    "locality": "新潟市",
    "guideId": "toki-messe",
    "kind": "venue",
    "sourceUrls": [
      "https://www.tokimesse.com/sp/visitor/event/index"
    ]
  },
  {
    "id": "makomanai-ice",
    "name": "真駒内セキスイハイムアイスアリーナ",
    "aliases": [
      "真駒内アイスアリーナ",
      "マコマナイセキスイハイムアイスアリーナ",
      "まこまないせきすいはいむあいすありーな"
    ],
    "eventVenueNames": [
      "真駒内セキスイハイムアイスアリーナ"
    ],
    "eventVenueIds": [
      "makomanai-arena",
      "makomanai-ice-arena",
      "makomanai-sekisuiheim-ice-arena",
      "official-news-34b530e0e351e5cf"
    ],
    "eventIds": [
      "ea3409b159bf32594639",
      "87c4b0c9bc782f6f1e0f",
      "1dfcf22b2697c4901a37",
      "2e71e5f83d1a351f5c33",
      "5faf8f864e8c2e9098ab",
      "0abde9ae102afcc1d441",
      "0c3e875b25fa06d7abbb"
    ],
    "prefecture": "北海道",
    "region": "北海道・東北",
    "locality": "札幌市",
    "kind": "venue",
    "sourceUrls": [
      "https://makomanai-park.jp/icearena/seats/"
    ]
  },
  {
    "id": "sony-headquarters-hall",
    "name": "ソニーグループ本社 2F 大会議場",
    "aliases": [
      "ソニーグループ本社",
      "ソニーグループホンシャ ニカイ ダイカイギジョウ",
      "そにーぐるーぷほんしゃ にかい だいかいぎじょう"
    ],
    "eventVenueNames": [
      "ソニーグループ本社 2F 大会議場"
    ],
    "eventVenueIds": [
      "official-news-185881ad0d76a0b2"
    ],
    "eventIds": [
      "9b33b1b04c88bf057f81",
      "c57b1d3f5a208dd94efe",
      "6993a74065eac2ed3067",
      "c2aca33a0075f686c696",
      "e0b4ea8fd7b3742aafbb"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.sonypcl.jp/into-the-world/index.html"
    ]
  },
  {
    "id": "tachikawa-stage-garden",
    "name": "TACHIKAWA STAGE GARDEN",
    "aliases": [
      "立川ステージガーデン",
      "タチカワステージガーデン",
      "たちかわすてーじがーでん"
    ],
    "eventVenueNames": [
      "TACHIKAWA STAGE GARDEN"
    ],
    "eventVenueIds": [
      "official-news-d04796d1d0fb4ea8"
    ],
    "eventIds": [
      "aaa8a669ad17731984f9",
      "721dde6da11b81b3d64e"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": "立川市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.t-sg.jp/organizers/files/seatingchart.pdf"
    ]
  },
  {
    "id": "aichi-sky-expo-a",
    "name": "Aichi Sky Expo（愛知県国際展示場）Aホール",
    "aliases": [
      "Aichi Sky Expo",
      "愛知県国際展示場",
      "アイチスカイエキスポ エーホール",
      "アイチケンコクサイテンジジョウ エーホール",
      "あいちすかいえきすぽ えーほーる",
      "あいちけんこくさいてんじじょう えーほーる"
    ],
    "eventVenueNames": [
      "Aichi Sky Expo（愛知県国際展示場）Aホール"
    ],
    "eventVenueIds": [
      "aichi-sky-expo"
    ],
    "eventIds": [
      "478e30292d7a0cc9bbcd",
      "6cfacd176636b5579b7c"
    ],
    "prefecture": "愛知県",
    "region": "東海",
    "locality": "常滑市",
    "kind": "venue",
    "sourceUrls": [
      "https://starto.jp/s/p/live/10431",
      "https://www.aichiskyexpo.com/"
    ]
  },
  {
    "id": "ecopa-arena",
    "name": "エコパアリーナ",
    "aliases": [
      "えこぱありーな"
    ],
    "eventVenueNames": [
      "エコパアリーナ"
    ],
    "eventVenueIds": [
      "ecopa-arena"
    ],
    "eventIds": [
      "42cd8eb4f3374a0449b1",
      "7d1a9846f78ca7160c94",
      "22c6c9792b1a35950f21",
      "5fad30b880e2461376a1"
    ],
    "prefecture": "静岡県",
    "region": "東海",
    "locality": "袋井市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.ecopa.jp/facility/arena/seat/"
    ]
  },
  {
    "id": "kitayell",
    "name": "北海きたえーる",
    "aliases": [
      "きたえーる",
      "北海道立総合体育センター",
      "ホッカイキタエール",
      "ホッカイドウリツソウゴウタイイクセンター",
      "ほっかいきたえーる",
      "ほっかいどうりつそうごうたいいくせんたー"
    ],
    "eventVenueNames": [
      "北海きたえーる"
    ],
    "eventVenueIds": [
      "hokkai-kitayell"
    ],
    "eventIds": [
      "56ef7996671a43dff3d6",
      "6173aa2c3c3eff887477"
    ],
    "prefecture": "北海道",
    "region": "北海道・東北",
    "locality": "札幌市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.kitayell.jp/facilities/sports/main-arena/#anchor_02",
      "https://www.kitayell.jp/facilities/sports/main-arena/"
    ]
  },
  {
    "id": "lala-arena",
    "name": "LaLa arena TOKYO-BAY（ららアリーナ 東京ベイ）",
    "aliases": [
      "ららアリーナ 東京ベイ",
      "LaLa arena TOKYO-BAY",
      "ららアリーナ",
      "ララアリーナトウキョウベイ",
      "ららありーなとうきょうべい"
    ],
    "eventVenueNames": [
      "ららアリーナ 東京ベイ",
      "LaLa arena TOKYO-BAY"
    ],
    "eventVenueIds": [
      "lalaarena-tokyo-bay",
      "official-news-89c2b0d867cd5487"
    ],
    "eventIds": [
      "aebdb5920c8446d18db6",
      "fa63b2bdb1f29b5fd614",
      "0abb7abb37157a2b196b",
      "dc80064e74b411ede3c1",
      "c12345d3bbab2fc43adf",
      "33a53b2bda78bb277703",
      "e910d3c03ad4ac457740",
      "d1bd5117de7e9f38b6ce",
      "eafefaf6e18896426a69",
      "bbe1e75b15b5cdd4d90b",
      "40848f04d4065e4afb7f",
      "e4814bda9775a29da7d2",
      "7646dad9c80342d3cc45"
    ],
    "prefecture": "千葉県",
    "region": "関東",
    "locality": "船橋市",
    "kind": "venue",
    "sourceUrls": [
      "https://lalaarenatokyo-bay.com/seats/"
    ]
  },
  {
    "id": "sundome-fukui",
    "name": "サンドーム福井",
    "aliases": [
      "サンドームフクイ",
      "さんどーむふくい"
    ],
    "eventVenueNames": [
      "サンドーム福井"
    ],
    "eventVenueIds": [
      "sundome-fukui"
    ],
    "eventIds": [
      "3a876bd4597571d82c69",
      "7f10ba5e6e580cab251b",
      "d6a7f69f75e03e58cb75",
      "64081d0c5d8d48ca7245"
    ],
    "prefecture": "福井県",
    "region": "北陸・甲信越",
    "locality": "越前市",
    "kind": "venue",
    "sourceUrls": [
      "https://sundome.sankan.jp/wordpress/wp-content/uploads/2022/12/eventhall_seat.pdf",
      "https://sundome.sankan.jp/download/"
    ]
  },
  {
    "id": "ig-arena",
    "name": "IGアリーナ",
    "aliases": [
      "アイジーアリーナ",
      "あいじーありーな"
    ],
    "eventVenueNames": [
      "IGアリーナ"
    ],
    "eventVenueIds": [
      "ig-arena"
    ],
    "eventIds": [
      "a59a65087620fa1c9f1b",
      "c0be16a948063165efd6",
      "74009a722c46b18c5fca",
      "cbc30f3648445ca6412f",
      "5d979eb07b3359b8a83c",
      "09f3f1d2bcadfd6c7f93"
    ],
    "prefecture": "愛知県",
    "region": "東海",
    "locality": "名古屋市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.ig-arena.jp/seat/",
      "https://www.ig-arena.jp/access/"
    ]
  },
  {
    "id": "hmv-books-shibuya-event",
    "name": "HMV&BOOKS SHIBUYA 5Fイベントスペース",
    "aliases": [
      "HMV&BOOKS SHIBUYA ５Fイベントスペース",
      "HMV&BOOKS SHIBUYA",
      "HMV渋谷",
      "エイチエムブイアンドブックスシブヤ ゴカイイベントスペース",
      "えいちえむぶいあんどぶっくすしぶや ごかいいべんとすぺーす"
    ],
    "eventVenueNames": [
      "HMV&BOOKS SHIBUYA 5Fイベントスペース",
      "HMV&BOOKS SHIBUYA ５Fイベントスペース"
    ],
    "eventVenueIds": [
      "official-news-14d1ec4dc82f82b9"
    ],
    "eventIds": [
      "3dfee923974510f56947",
      "8b8dab26c8c43f80cb34"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.sonymusic.co.jp/artist/NEXZ/info/583954",
      "https://www.sonymusic.co.jp/artist/NEXZ/info/584380",
      "https://www.hmv.co.jp/store/btk/"
    ]
  },
  {
    "id": "spotify-o-east",
    "name": "Spotify O-EAST",
    "aliases": [
      "O-EAST",
      "スポティファイオーイースト",
      "オーイースト",
      "すぽてぃふぁいおーいーすと",
      "おーいーすと"
    ],
    "eventVenueNames": [
      "Spotify O-EAST"
    ],
    "eventVenueIds": [
      "official-news-c06f1707f8157c24"
    ],
    "eventIds": [
      "fa0165d2861b460e7c20"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://shibuya-o.com/east/about/",
      "https://shibuya-o.com/east/"
    ]
  },
  {
    "id": "united-lab",
    "name": "UNITED LAB",
    "aliases": [
      "UNITEDLAB",
      "ユナイテッドラボ",
      "ゆないてっどらぼ"
    ],
    "eventVenueNames": [
      "UNITED LAB"
    ],
    "eventVenueIds": [
      "official-news-a67a9d12640742a5"
    ],
    "eventIds": [
      "0969e1a2734a70d55584"
    ],
    "prefecture": "福岡県",
    "region": "九州・沖縄",
    "locality": "福岡市",
    "kind": "venue",
    "sourceUrls": [
      "https://gene.exfamily.jp/s/ldh04/page/l_ryota_tour2026",
      "https://unitedlab.live/"
    ]
  },
  {
    "id": "takara-osaka",
    "name": "Takara Osaka",
    "aliases": [
      "タカラオオサカ",
      "たからおおさか"
    ],
    "eventVenueNames": [
      "Takara Osaka"
    ],
    "eventVenueIds": [
      "official-news-41d852e3dac87488"
    ],
    "eventIds": [
      "f32133c38a94f3e9a2aa"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "kind": "venue",
    "sourceUrls": [
      "https://takara-live.com/osaka/hall_info/pdf/secondfloormap.pdf?ud=210113",
      "https://takara-live.com/"
    ]
  },
  {
    "id": "aeon-makuhari-grand-square",
    "name": "イオンモール幕張新都心 グランドスクエア",
    "aliases": [
      "イオンモール幕張新都心グランドモール1Fグランドスクエア",
      "イオンモール幕張新都心",
      "イオンモールマクハリシントシン グランドスクエア",
      "いおんもーるまくはりしんとしん ぐらんどすくえあ"
    ],
    "eventVenueNames": [
      "イオンモール幕張新都心グランドモール1Fグランドスクエア"
    ],
    "eventVenueIds": [
      "official-news-c33f139945097494"
    ],
    "eventIds": [
      "20d38b3f5b5eff9a0b4e"
    ],
    "prefecture": "千葉県",
    "region": "関東",
    "locality": "千葉市",
    "kind": "venue",
    "sourceUrls": [
      "https://fruitszipper.asobisystem.com/news/detail/83744",
      "https://space-media.aeonmall.com/spaces/1692"
    ]
  },
  {
    "id": "glion-arena",
    "name": "GLION ARENA KOBE",
    "aliases": [
      "ジーライオンアリーナ神戸",
      "ジーアリ",
      "ジーライオンアリーナコウベ",
      "じーらいおんありーなこうべ"
    ],
    "eventVenueNames": [
      "GLION ARENA KOBE"
    ],
    "eventVenueIds": [
      "official-news-4ce9eb782f9d0fe5"
    ],
    "eventIds": [
      "d50f07c7ed6b2184a707",
      "60f55e6d1f84f17337be",
      "a716cb5f7cb4e87a3946",
      "6a10f3b0e88381ceb4fa"
    ],
    "prefecture": "兵庫県",
    "region": "関西",
    "locality": "神戸市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.totteikobe.jp/pdf/map/map_floor.pdf#page=5",
      "https://www.totteikobe.jp/map/arena/?tabName=seat",
      "https://www.totteikobe.jp/news/article/680",
      "https://files.totteikobe.jp/2025/10/minatonokaze_02.pdf"
    ]
  },
  {
    "id": "world-kinen-hall",
    "name": "神戸ワールド記念ホール",
    "aliases": [
      "ワールド記念ホール",
      "コウベワールドキネンホール",
      "こうべわーるどきねんほーる"
    ],
    "eventVenueNames": [
      "神戸ワールド記念ホール"
    ],
    "eventVenueIds": [
      "kobe-world-hall"
    ],
    "eventIds": [
      "3188bcc0679a95f247b5",
      "bba2ed9ad8c8af1cf373"
    ],
    "prefecture": "兵庫県",
    "region": "関西",
    "locality": "神戸市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.kobe-spokyo.jp/pdf/world/kyakuseki_floorguide3.pdf",
      "https://www.kobe-spokyo.jp/world-kobe/guide/zaseki"
    ]
  },
  {
    "id": "parc-jean-drapeau",
    "name": "Parc Jean-Drapeau",
    "aliases": [
      "ジャン・ドラポー公園",
      "ジャンドラポーコウエン",
      "じゃんどらぽーこうえん"
    ],
    "eventVenueNames": [
      "Parc Jean-Drapeau"
    ],
    "eventVenueIds": [
      "official-news-26241ef47aba0ba7"
    ],
    "eventIds": [
      "9313becc7e96c76eb6ba"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://images.ctfassets.net/dv1qnlptav0x/2ZU7JDhxlUMiAx1x1g1Euu/fc8eaf2356bab4f127426c790b83dd8e/OSH26-Divers-PlanDeSite-Publique-Final.jpg?w=2700&h=1896",
      "https://osheaga.com/en",
      "https://www.city.osaka.lg.jp/kensetsu/cmsfiles/contents/0000465/465020/sanko5.pdf"
    ]
  },
  {
    "id": "tif-info-centre",
    "name": "フジテレビ湾岸スタジオ内特設ステージ「INFO CENTRE」",
    "aliases": [
      "INFO CENTRE",
      "フジテレビ湾岸スタジオ",
      "フジテレビワンガンスタジオナイトクセツステージ インフォセンター",
      "ふじてれびわんがんすたじおないとくせつすてーじ いんふぉせんたー"
    ],
    "eventVenueNames": [
      "フジテレビ湾岸スタジオ内特設ステージ「INFO CENTRE」"
    ],
    "eventVenueIds": [
      "official-news-d4041b9986e46d77"
    ],
    "eventIds": [
      "edb0ab0f937ae0e9790b"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://official.idolfes.com/s/tif2026/page/map?ima=0000",
      "https://official.idolfes.com/s/tif2026/"
    ]
  },
  {
    "id": "grant-park",
    "name": "Grant Park",
    "aliases": [
      "グラントパーク",
      "ぐらんとぱーく"
    ],
    "eventVenueNames": [
      "Grant Park"
    ],
    "eventVenueIds": [
      "official-news-d89e3bc3148b633f"
    ],
    "eventIds": [
      "309320e5d4e02eb31c9e"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://help.lollapalooza.com/article/959-festival-map",
      "https://help.lollapalooza.com/"
    ]
  },
  {
    "id": "td-garden",
    "name": "TD Garden",
    "aliases": [
      "ティーディーガーデン",
      "てぃーでぃーがーでん"
    ],
    "eventVenueNames": [
      "TD Garden"
    ],
    "eventVenueIds": [
      "official-news-266e0fa381c6a4e3"
    ],
    "eventIds": [
      "1d7f71787907f9ca270b"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.tdgarden.com/plan-your-visit/seating"
    ]
  },
  {
    "id": "nishinomiya-gardens-stage",
    "name": "阪急西宮ガーデンズ 木の葉のステージ",
    "aliases": [
      "阪急西宮ガーデンズ 本館 4F スカイガーデン 木の葉のステージ",
      "阪急西宮ガーデンズ",
      "ハンキュウニシノミヤガーデンズ コノハノステージ",
      "はんきゅうにしのみやがーでんず このはのすてーじ"
    ],
    "eventVenueNames": [
      "阪急西宮ガーデンズ 本館 4F スカイガーデン 木の葉のステージ"
    ],
    "eventVenueIds": [
      "official-news-cc998034251c4b27"
    ],
    "eventIds": [
      "6bb225f9c3828a146ff8"
    ],
    "prefecture": "兵庫県",
    "region": "関西",
    "locality": "西宮市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.sonymusic.co.jp/artist/KentoNakajima/info/585318",
      "https://nishinomiya-gardens.com/shopguide/detail/1"
    ]
  },
  {
    "id": "emiterrace-tokorozawa",
    "name": "エミテラス所沢 TOKOROZAWA e-CUBE",
    "aliases": [
      "エミテラス所沢 2F TOKOROZAWA e-CUBE",
      "エミテラス所沢",
      "エミテラストコロザワ トコロザワイーキューブ",
      "えみてらすところざわ ところざわいーきゅーぶ"
    ],
    "eventVenueNames": [
      "エミテラス所沢 2F TOKOROZAWA e-CUBE"
    ],
    "eventVenueIds": [
      "official-news-da55d678428b436d"
    ],
    "eventIds": [
      "99f8d2a8a794085c4b62"
    ],
    "prefecture": "埼玉県",
    "region": "関東",
    "locality": "所沢市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.sonymusic.co.jp/img/common/artist_image/77710000/77710002/images/202607241028460.jpg",
      "https://et-ge-tokorozawa.com/eventspace/"
    ]
  },
  {
    "id": "barclays",
    "name": "Barclays Center",
    "aliases": [
      "バークレイズセンター",
      "ばーくれいずせんたー"
    ],
    "eventVenueNames": [
      "Barclays Center"
    ],
    "eventVenueIds": [
      "official-news-045a893ad57f059f"
    ],
    "eventIds": [
      "a4e519b5e42638afba2f"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.barclayscenter.com/center-info/seating-charts"
    ]
  },
  {
    "id": "iwaki-alios",
    "name": "いわき芸術文化交流館アリオス アルパイン大ホール",
    "aliases": [
      "Alios Iwaki Performing Arts Center Main Hall",
      "いわきアリオス",
      "アリオス大ホール",
      "イワキゲイジュツブンカコウリュウカンアリオス アルパインダイホール",
      "いわきげいじゅつぶんかこうりゅうかんありおす あるぱいんだいほーる"
    ],
    "eventVenueNames": [
      "Alios Iwaki Performing Arts Center Main Hall"
    ],
    "eventVenueIds": [
      "official-news-5c82c17b1b3aa160"
    ],
    "eventIds": [
      "ea6f2a8f32eb49e7dc03"
    ],
    "prefecture": "福島県",
    "region": "北海道・東北",
    "locality": "いわき市",
    "kind": "venue",
    "sourceUrls": [
      "https://iwaki-alios.jp/facilities/main-hall/seat-mainhall"
    ]
  },
  {
    "id": "td-coliseum",
    "name": "TD Coliseum",
    "aliases": [
      "ティーディーコロシアム",
      "てぃーでぃーころしあむ"
    ],
    "eventVenueNames": [
      "TD Coliseum"
    ],
    "eventVenueIds": [
      "official-news-0f1caeb0ebc9b4aa"
    ],
    "eventIds": [
      "c8b725a8c379d4db66aa"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.tdcoliseum.com/plan-your-visit/seating-maps"
    ]
  },
  {
    "id": "hitachi-seaside-park",
    "name": "国営ひたち海浜公園",
    "aliases": [
      "ひたち海浜公園",
      "コクエイヒタチカイヒンコウエン",
      "こくえいひたちかいひんこうえん"
    ],
    "eventVenueNames": [
      "国営ひたち海浜公園"
    ],
    "eventVenueIds": [
      "official-news-2f91d4bddfd103b8"
    ],
    "eventIds": [
      "57cc130de83682a23df9"
    ],
    "prefecture": "茨城県",
    "region": "関東",
    "locality": "ひたちなか市",
    "kind": "venue",
    "sourceUrls": [
      "https://luckyfes.com/en/area-map"
    ]
  },
  {
    "id": "kyoto-pulse-plaza",
    "name": "京都パルスプラザ",
    "aliases": [
      "京都府総合見本市会館",
      "キョウトパルスプラザ",
      "きょうとぱるすぷらざ"
    ],
    "eventVenueNames": [
      "京都パルスプラザ"
    ],
    "eventVenueIds": [
      "official-news-ed84974818b6f1b7"
    ],
    "eventIds": [
      "5a31c037bb85aa558d66",
      "bb9072aaafc20f41cda2"
    ],
    "prefecture": "京都府",
    "region": "関西",
    "locality": "京都市",
    "kind": "venue",
    "sourceUrls": [
      "https://niziu.com/s/n123/page/2ndEP_event",
      "https://skz-stayjapan.com/s/n104/news/detail/13266",
      "https://www.pulseplaza.jp/"
    ]
  },
  {
    "id": "climate-pledge",
    "name": "Climate Pledge Arena",
    "aliases": [
      "クライメットプレッジアリーナ",
      "くらいめっとぷれっじありーな"
    ],
    "eventVenueNames": [
      "Climate Pledge Arena"
    ],
    "eventVenueIds": [
      "official-news-f822a9fc005e97b5"
    ],
    "eventIds": [
      "3e16c6837b90626a08a7"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://climatepledgearena.com/arena-maps/"
    ]
  },
  {
    "id": "takasaki-theatre",
    "name": "高崎芸術劇場 大劇場",
    "aliases": [
      "TAKASAKI CITY THEATRE Grand Theatre",
      "高崎芸術劇場",
      "タカサキゲイジュツゲキジョウ ダイゲキジョウ",
      "たかさきげいじゅつげきじょう だいげきじょう"
    ],
    "eventVenueNames": [
      "TAKASAKI CITY THEATRE Grand Theatre"
    ],
    "eventVenueIds": [
      "official-news-4d85027cba3f3096"
    ],
    "eventIds": [
      "916a0f333b814b09bc36"
    ],
    "prefecture": "群馬県",
    "region": "関東",
    "locality": "高崎市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.takasaki-foundation.or.jp/theatre/gt.php"
    ]
  },
  {
    "id": "expo-commemoration-park",
    "name": "万博記念公園",
    "aliases": [
      "バンパクキネンコウエン",
      "ばんぱくきねんこうえん"
    ],
    "eventVenueNames": [
      "万博記念公園"
    ],
    "eventVenueIds": [
      "official-news-28eb467230faec82"
    ],
    "eventIds": [
      "a7768c3e6d1f48f3e72c",
      "4d0a9a359f500ab3bcc0",
      "8b19aa2e0170e5c0ec24",
      "28b321db7863b604b0f3"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "吹田市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.summersonic.com/info/osaka/map/",
      "https://2026.kamigataboyz.com/"
    ]
  },
  {
    "id": "oakland-arena",
    "name": "Oakland Arena",
    "aliases": [
      "オークランドアリーナ",
      "おーくらんどありーな"
    ],
    "eventVenueNames": [
      "Oakland Arena"
    ],
    "eventVenueIds": [
      "official-news-66ce52a38197a283"
    ],
    "eventIds": [
      "5231e00117309e93a6f1"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.theoaklandarena.com/venues-events/seating-charts"
    ]
  },
  {
    "id": "summer-sonic-tokyo-venues",
    "name": "ZOZOマリンスタジアム＆幕張メッセ",
    "aliases": [
      "ゾゾマリンスタジアムアンドマクハリメッセ",
      "ぞぞまりんすたじあむあんどまくはりめっせ"
    ],
    "eventVenueNames": [
      "ZOZOマリンスタジアム＆幕張メッセ"
    ],
    "eventVenueIds": [
      "official-news-ac6c8d04fa70b8b2"
    ],
    "eventIds": [
      "af6c613a41e6f893c306",
      "ec30adf5e42c67d8b2cc"
    ],
    "prefecture": "千葉県",
    "region": "関東",
    "locality": "千葉市",
    "kind": "multiple-venues",
    "sourceUrls": [
      "https://www.summersonic.com/info/tokyo/map/"
    ]
  },
  {
    "id": "hollywood-bowl",
    "name": "Hollywood Bowl",
    "aliases": [
      "ハリウッドボウル",
      "はりうっどぼうる"
    ],
    "eventVenueNames": [
      "Hollywood Bowl"
    ],
    "eventVenueIds": [
      "official-news-3dbe8a2bc19d2f33"
    ],
    "eventIds": [
      "2aa555f2227cf02da849"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.hollywoodbowl.com/tickets-and-events/seating-chart"
    ]
  },
  {
    "id": "iichiko-grand",
    "name": "iichikoグランシアタ",
    "aliases": [
      "Oita iichiko Grand Theater",
      "iichiko総合文化センター",
      "イイチコグランシアタ",
      "いいちこぐらんしあた"
    ],
    "eventVenueNames": [
      "Oita iichiko Grand Theater"
    ],
    "eventVenueIds": [
      "official-news-edfc4503fed88123"
    ],
    "eventIds": [
      "e695a330b45e517044fe"
    ],
    "prefecture": "大分県",
    "region": "九州・沖縄",
    "locality": "大分市",
    "kind": "venue",
    "sourceUrls": [
      "https://emo.or.jp/facilities/grand-theater/"
    ]
  },
  {
    "id": "nagasaki-brick",
    "name": "ベネックス長崎ブリックホール",
    "aliases": [
      "BENEX Nagasaki Brick Hall",
      "長崎ブリックホール",
      "ベネックスナガサキブリックホール",
      "べねっくすながさきぶりっくほーる"
    ],
    "eventVenueNames": [
      "BENEX Nagasaki Brick Hall"
    ],
    "eventVenueIds": [
      "official-news-c4d6d7ca10a5ff85"
    ],
    "eventIds": [
      "de6da7add38584d6e9cb"
    ],
    "prefecture": "長崎県",
    "region": "九州・沖縄",
    "locality": "長崎市",
    "kind": "venue",
    "sourceUrls": [
      "https://brickhall.jp/floor/large_hall/"
    ]
  },
  {
    "id": "taipei-arena",
    "name": "台北アリーナ",
    "aliases": [
      "臺北小巨蛋",
      "台北小巨蛋",
      "タイペイアリーナ",
      "たいぺいありーな"
    ],
    "eventVenueNames": [
      "台北アリーナ"
    ],
    "eventVenueIds": [
      "official-news-e60838b692703855"
    ],
    "eventIds": [
      "eb309895fa35220e8556",
      "d9e8fa36a9ad52c713c3"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.arena.taipei/cp.aspx?n=95731497B5FCEDDB",
      "https://backnumber.info/special_site/stadiumtour2026/detail/350"
    ]
  },
  {
    "id": "taipei-dome",
    "name": "臺北大巨蛋",
    "aliases": [
      "台北ドーム",
      "台北大巨蛋",
      "Taipei Dome",
      "タイペイドーム",
      "たいぺいどーむ"
    ],
    "eventVenueNames": [
      "臺北大巨蛋"
    ],
    "eventVenueIds": [
      "official-news-72c7b7dff9a962ee"
    ],
    "eventIds": [
      "819f958604995f43bb9d"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.farglorydome.com.tw/park-detail/map/"
    ]
  },
  {
    "id": "trc-tokyo",
    "name": "東京流通センター",
    "aliases": [
      "TRC",
      "トウキョウリュウツウセンター",
      "とうきょうりゅうつうせんたー"
    ],
    "eventVenueNames": [
      "東京流通センター"
    ],
    "eventVenueIds": [
      "official-news-ba55861f7c95e533"
    ],
    "eventIds": [
      "386670fe98b1125a0341"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://niziu.com/s/n123/page/2ndEP_event",
      "https://trc-event.jp/download/"
    ]
  },
  {
    "id": "tokyo-undisclosed",
    "name": "東京都某所",
    "aliases": [
      "都内某所",
      "トウキョウトボウショ",
      "トナイボウショ",
      "とうきょうとぼうしょ",
      "とないぼうしょ"
    ],
    "eventVenueNames": [
      "東京都某所"
    ],
    "eventVenueIds": [
      "official-news-e447257ca814f96b"
    ],
    "eventIds": [
      "fa1437f4ecbfa2ef1b4a",
      "3c2e24348807d3a934c5",
      "2616423599183b079cd7"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "ambiguous",
    "sourceUrls": [
      "https://zerobaseone.jp/news/detail/1165",
      "https://cf.zerobaseone.jp/news/detail/1185"
    ]
  },
  {
    "id": "kochi-hall",
    "name": "新来島高知重工ホール",
    "aliases": [
      "SHIN KURUSHIMA KOCHIJYUKO Hall",
      "高知県立県民文化ホール",
      "シンクルシマコウチジュウコウホール",
      "しんくるしまこうちじゅうこうほーる"
    ],
    "eventVenueNames": [
      "SHIN KURUSHIMA KOCHIJYUKO Hall"
    ],
    "eventVenueIds": [
      "official-news-a33d85a995772053"
    ],
    "eventIds": [
      "70cb1d0d9d949f69283e"
    ],
    "prefecture": "高知県",
    "region": "四国",
    "locality": "高知市",
    "kind": "venue",
    "sourceUrls": [
      "https://kkb-hall.jp/facility/hall-data.html",
      "https://www.skj-kk.co.jp/skj-news/news/detail.php?no=1762837672"
    ]
  },
  {
    "id": "yonago-bigship",
    "name": "米子コンベンションセンター ビッグシップ",
    "aliases": [
      "Yonago Convention Center BIG SHIP",
      "米子コンベンションセンター",
      "BIG SHIP",
      "ヨナゴコンベンションセンター ビッグシップ",
      "よなごこんべんしょんせんたー びっぐしっぷ"
    ],
    "eventVenueNames": [
      "Yonago Convention Center BIG SHIP"
    ],
    "eventVenueIds": [
      "official-news-a58d0e6725e36284"
    ],
    "eventIds": [
      "c4426e66344b6c7b1e90"
    ],
    "prefecture": "鳥取県",
    "region": "中国",
    "locality": "米子市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.bigship.or.jp/bigship/guest/5/"
    ]
  },
  {
    "id": "zepp-newtaipei",
    "name": "Zepp New Taipei",
    "aliases": [
      "ゼップニュータイペイ",
      "ぜっぷにゅーたいぺい"
    ],
    "eventVenueNames": [
      "Zepp New Taipei"
    ],
    "eventVenueIds": [
      "official-news-810be20000468708"
    ],
    "eventIds": [
      "58c17cf12fde5e1ed750",
      "601225e27f45b4fbbead"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.zepp.co.jp/~pj-zepp/wordpress/wp-content/uploads/2023/08/08231312/nt_seat.pdf",
      "https://www.zepp.co.jp/hall/newtaipei/"
    ]
  },
  {
    "id": "dojima-river",
    "name": "堂島リバーフォーラム",
    "aliases": [
      "ドウジマリバーフォーラム",
      "どうじまりばーふぉーらむ"
    ],
    "eventVenueNames": [
      "堂島リバーフォーラム"
    ],
    "eventVenueIds": [
      "official-news-21329122ce2c4a4d"
    ],
    "eventIds": [
      "56922d71f71f15db1e0f"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.dojimariver.com/wp/wp-content/uploads/2023/02/hall_05layout.pdf",
      "https://www.dojimariver.com/hall/"
    ]
  },
  {
    "id": "aichi-art-theatre",
    "name": "愛知県芸術劇場 大ホール",
    "aliases": [
      "Aichi Prefectural Art Theater Main Theater",
      "愛知県芸術劇場",
      "アイチケンゲイジュツゲキジョウ ダイホール",
      "あいちけんげいじゅつげきじょう だいほーる"
    ],
    "eventVenueNames": [
      "Aichi Prefectural Art Theater Main Theater"
    ],
    "eventVenueIds": [
      "official-news-8baaad2b9efa9f6f"
    ],
    "eventIds": [
      "5910715fcf02c0643108"
    ],
    "prefecture": "愛知県",
    "region": "東海",
    "locality": "名古屋市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.aac.pref.aichi.jp/rent/item/main_seat_R20710.pdf",
      "https://www.aac.pref.aichi.jp/rent/theater/facility.html"
    ]
  },
  {
    "id": "grand-hall-shinagawa",
    "name": "品川 ザ・グランドホール",
    "aliases": [
      "品川グランドホール",
      "シナガワザグランドホール",
      "しながわざぐらんどほーる"
    ],
    "eventVenueNames": [
      "品川 ザ・グランドホール"
    ],
    "eventVenueIds": [
      "official-news-d5d7c6710457000f"
    ],
    "eventIds": [
      "c169f0853f9f3708631b"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://tg-hall.com/download"
    ]
  },
  {
    "id": "aomori-link-station",
    "name": "リンクステーションホール青森",
    "aliases": [
      "LINK STATION HALL AOMORI",
      "青森市文化会館",
      "リンクステーションホールアオモリ",
      "りんくすてーしょんほーるあおもり"
    ],
    "eventVenueNames": [
      "LINK STATION HALL AOMORI"
    ],
    "eventVenueIds": [
      "official-news-e78496234bd399af"
    ],
    "eventIds": [
      "dafb37bb35062d567ebb"
    ],
    "prefecture": "青森県",
    "region": "北海道・東北",
    "locality": "青森市",
    "kind": "venue",
    "sourceUrls": [
      "https://aobunkanko.com/wp-content/uploads/2024/12/kaikan-zaseki.pdf",
      "https://aobunkanko.com/facility/linkstationhall/"
    ]
  },
  {
    "id": "iwate-hall",
    "name": "トーサイクラシックホール岩手",
    "aliases": [
      "Tosai Classic Hall Iwate",
      "岩手県民会館",
      "トーサイクラシックホールイワテ",
      "とーさいくらしっくほーるいわて"
    ],
    "eventVenueNames": [
      "Tosai Classic Hall Iwate"
    ],
    "eventVenueIds": [
      "official-news-777284aaa6b36893"
    ],
    "eventIds": [
      "725d0624941f4d175ed0"
    ],
    "prefecture": "岩手県",
    "region": "北海道・東北",
    "locality": "盛岡市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.iwate-kenmin.jp/facility/mainhall-seat/"
    ]
  },
  {
    "id": "siam-pic",
    "name": "SiamPic Hall",
    "aliases": [
      "Siam Pic Hall",
      "サイアムピックホール",
      "さいあむぴっくほーる"
    ],
    "eventVenueNames": [
      "SiamPic Hall"
    ],
    "eventVenueIds": [
      "official-news-c49d20f79efda337"
    ],
    "eventIds": [
      "465d43dcce5b7e7c8aa5",
      "cb9c2f79b740d43c5fb3"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.siampicganesha.com/en/seatingview"
    ]
  },
  {
    "id": "anaheim-convention-center",
    "name": "アナハイム・コンベンションセンター",
    "aliases": [
      "Anaheim Convention Center",
      "アナハイムコンベンションセンター",
      "あなはいむこんべんしょんせんたー"
    ],
    "eventVenueNames": [
      "アナハイム・コンベンションセンター"
    ],
    "eventVenueIds": [
      "official-news-f9b20af8b57d6ab8"
    ],
    "eventIds": [
      "c1d8fc2d111c904648ee"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://blizzcon.com/en-us/floor-map/"
    ]
  },
  {
    "id": "sgc-ariake",
    "name": "SGCホール有明",
    "aliases": [
      "エスジーシーホールアリアケ",
      "えすじーしーほーるありあけ"
    ],
    "eventVenueNames": [
      "SGCホール有明"
    ],
    "eventVenueIds": [
      "official-news-dbc18436588ab34e"
    ],
    "eventIds": [
      "e5bef6b39963ba5638f4",
      "a3292d0624f7d72e3462",
      "6d6fbbc2779fe99dfdff",
      "93496a230650e1c5756c"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://tdp.tv-asahi.co.jp/hall/about/"
    ]
  },
  {
    "id": "grammy-museum",
    "name": "Grammy Museum",
    "aliases": [
      "グラミーミュージアム",
      "ぐらみーみゅーじあむ"
    ],
    "eventVenueNames": [
      "Grammy Museum"
    ],
    "eventVenueIds": [
      "official-news-952de3ea6fd2626c"
    ],
    "eventIds": [
      "c028c8739e1d54a0bb4d"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://grammymuseum.org/event/spotlight-yoasobi/"
    ]
  },
  {
    "id": "niigata-prefectural",
    "name": "新潟県民会館",
    "aliases": [
      "Niigata Prefectural Civic Center",
      "ニイガタケンミンカイカン",
      "にいがたけんみんかいかん"
    ],
    "eventVenueNames": [
      "Niigata Prefectural Civic Center"
    ],
    "eventVenueIds": [
      "official-news-e959e0f9f0cf04c0"
    ],
    "eventIds": [
      "9f415c3dbf0a3eb0e55e"
    ],
    "prefecture": "新潟県",
    "region": "北陸・甲信越",
    "locality": "新潟市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.niigata-kenminkaikan.jp/information/seat/large-hall-seat/"
    ]
  },
  {
    "id": "kanazawa-theatre",
    "name": "金沢歌劇座",
    "aliases": [
      "THE KANAZAWA THEATRE",
      "カナザワカゲキザ",
      "かなざわかげきざ"
    ],
    "eventVenueNames": [
      "THE KANAZAWA THEATRE"
    ],
    "eventVenueIds": [
      "official-news-1ec9ea3a1cf05d59"
    ],
    "eventIds": [
      "b6aa4fa6a8a78997e5a4"
    ],
    "prefecture": "石川県",
    "region": "北陸・甲信越",
    "locality": "金沢市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.kagekiza.gr.jp/data/facilities/seat.pdf"
    ]
  },
  {
    "id": "karasuma-peninsula",
    "name": "滋賀県草津市 烏丸半島芝生広場",
    "aliases": [
      "烏丸半島芝生広場",
      "烏丸半島",
      "シガケンクサツシ カラスマハントウシバフヒロバ",
      "しがけんくさつし からすまはんとうしばふひろば"
    ],
    "eventVenueNames": [
      "滋賀県草津市 烏丸半島芝生広場"
    ],
    "eventVenueIds": [
      "official-news-57755729f19d2992"
    ],
    "eventIds": [
      "ec4ef15e4ff81fcccd72"
    ],
    "prefecture": "滋賀県",
    "region": "関西",
    "locality": "草津市",
    "kind": "venue",
    "sourceUrls": [
      "https://fest-inazuma.com/2026/img/areamap/FESTINAZUMA2026_AREAMAP.svg?v=1788920258",
      "https://fest-inazuma.com/areamap/"
    ]
  },
  {
    "id": "toda-hall",
    "name": "TODAホール&カンファレンス東京",
    "aliases": [
      "TODAホール",
      "トダホールアンドカンファレンストウキョウ",
      "とだほーるあんどかんふぁれんすとうきょう"
    ],
    "eventVenueNames": [
      "TODAホール&カンファレンス東京"
    ],
    "eventVenueIds": [
      "official-news-1cbc2c7f6a6283d4"
    ],
    "eventIds": [
      "705e82434555c8aa5aef"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.toda-hall.jp/pdf/sample.pdf",
      "https://toda-hall.jp/pdf/sample.pdf"
    ]
  },
  {
    "id": "asahikawa",
    "name": "旭川市民文化会館",
    "aliases": [
      "Asahikawa Civic Culture Hall",
      "アサヒカワシミンブンカカイカン",
      "あさひかわしみんぶんかかいかん"
    ],
    "eventVenueNames": [
      "Asahikawa Civic Culture Hall"
    ],
    "eventVenueIds": [
      "official-news-1ec56c0d4140636f"
    ],
    "eventIds": [
      "3e16ac26cd7a6c1eef86"
    ],
    "prefecture": "北海道",
    "region": "北海道・東北",
    "locality": "旭川市",
    "kind": "venue",
    "sourceUrls": [
      "https://www1.city.asahikawa.hokkaido.jp/files/bunkashinko/siminbunka/contents31.html"
    ]
  },
  {
    "id": "intex-osaka-4-5",
    "name": "インテックス大阪 4号館・5号館",
    "aliases": [
      "インテックス大阪",
      "インテックスオオサカ ヨンゴウカンゴゴウカン",
      "いんてっくすおおさか よんごうかんごごうかん"
    ],
    "eventVenueNames": [
      "インテックス大阪 4号館・5号館"
    ],
    "eventVenueIds": [
      "official-news-8d1860662ccc8a7b"
    ],
    "eventIds": [
      "f7c2f2b8bdd16f4edaaa"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.koyabusonic.com/information/",
      "https://www.koyabusonic.com/"
    ]
  },
  {
    "id": "hakodate-hall",
    "name": "函館サーモン・まるなまホール 大ホール",
    "aliases": [
      "Hakodate Salmon Marunama Hall Large Hall",
      "函館市民会館",
      "函館サーモン・まるなまホール",
      "ハコダテサーモンマルナマホール ダイホール",
      "はこだてさーもんまるなまほーる だいほーる"
    ],
    "eventVenueNames": [
      "Hakodate Salmon Marunama Hall Large Hall"
    ],
    "eventVenueIds": [
      "official-news-497b2b41f9904597"
    ],
    "eventIds": [
      "5404e607fa2cb1e08e1b"
    ],
    "prefecture": "北海道",
    "region": "北海道・東北",
    "locality": "函館市",
    "kind": "venue",
    "sourceUrls": [
      "https://zaidan-hakodate.com/kaikan/newimages/zaseki20190601.pdf",
      "https://zaidan-hakodate.com/kaikan/download.html",
      "https://www.zaidan-hakodate.com/kaikan/download/marunamasyoumeikizaihyou.pdf"
    ]
  },
  {
    "id": "niterra-forest",
    "name": "Niterra日本特殊陶業市民会館フォレストホール",
    "aliases": [
      "日本特殊陶業市民会館",
      "フォレストホール",
      "ニテラニホントクシュトウギョウシミンカイカンフォレストホール",
      "にてらにほんとくしゅとうぎょうしみんかいかんふぉれすとほーる"
    ],
    "eventVenueNames": [
      "Niterra日本特殊陶業市民会館フォレストホール"
    ],
    "eventVenueIds": [
      "official-news-eaab289c13276b09"
    ],
    "eventIds": [
      "d80cbcd665fbd2a84d5f"
    ],
    "prefecture": "愛知県",
    "region": "東海",
    "locality": "名古屋市",
    "kind": "venue",
    "sourceUrls": [
      "https://nagoya-shimin.hall-info.jp/kaikan/reserve/seatingchart.html"
    ]
  },
  {
    "id": "kumamoto-country-park",
    "name": "熊本県農業公園 カントリーパーク",
    "aliases": [
      "熊本県農業公園",
      "クマモトケンノウギョウコウエン カントリーパーク",
      "くまもとけんのうぎょうこうえん かんとりーぱーく"
    ],
    "eventVenueNames": [
      "熊本県農業公園 カントリーパーク"
    ],
    "eventVenueIds": [
      "official-news-61c6aa43c072e81c"
    ],
    "eventIds": [
      "15fd1df24317824379b8",
      "d50392f5dcfd9b87cb20"
    ],
    "prefecture": "熊本県",
    "region": "九州・沖縄",
    "locality": "合志市",
    "kind": "venue",
    "sourceUrls": [
      "https://1chancefes.com/img/areamap.png",
      "https://1chancefes.com/"
    ]
  },
  {
    "id": "asiaworld-expo-10",
    "name": "AsiaWorld-Expo Hall 10",
    "aliases": [
      "アジアワールドエキスポ",
      "AsiaWorld-Expo",
      "アジアワールドエキスポ ホールテン",
      "あじあわーるどえきすぽ ほーるてん"
    ],
    "eventVenueNames": [
      "AsiaWorld-Expo Hall 10"
    ],
    "eventVenueIds": [
      "official-news-fa01548c567cddc6"
    ],
    "eventIds": [
      "eb3a14421410eeca5d7d",
      "79072af98f7b7ccf9bf2"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://backnumber.info/special_site/stadiumtour2026/detail/358"
    ]
  },
  {
    "id": "anabuki-arena",
    "name": "あなぶきアリーナ香川",
    "aliases": [
      "あなぶきアリーナ香川(香川県立アリーナ)",
      "香川県立アリーナ",
      "アナブキアリーナカガワ",
      "あなぶきありーなかがわ"
    ],
    "eventVenueNames": [
      "あなぶきアリーナ香川(香川県立アリーナ)"
    ],
    "eventVenueIds": [
      "official-news-1fe08cab1375cb65"
    ],
    "eventIds": [
      "8ab3d9caddad686134d4",
      "cee0a927f0dbf7d05164"
    ],
    "prefecture": "香川県",
    "region": "四国",
    "locality": "高松市",
    "kind": "venue",
    "sourceUrls": [
      "https://kagawa-arena.com/guide/",
      "https://mrsgreenapple.com/news/detail/23047"
    ]
  },
  {
    "id": "sangam-cj-enm",
    "name": "上岩CJ ENMセンター",
    "aliases": [
      "サンアムシージェイイーエヌエムセンター",
      "さんあむしーじぇいいーえぬえむせんたー"
    ],
    "eventVenueNames": [
      "上岩CJ ENMセンター"
    ],
    "eventVenueIds": [
      "official-news-fb82307842a0f8ed"
    ],
    "eventIds": [
      "0316e4055bc3ad7a6a18"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://ini-official.com/news/detail/4474",
      "https://www.cjenm.com/en/featured-contents/m-countdown/"
    ]
  },
  {
    "id": "olympic-hall",
    "name": "Olympic Hall",
    "aliases": [
      "オリンピックホール",
      "おりんぴっくほーる"
    ],
    "eventVenueNames": [
      "Olympic Hall"
    ],
    "eventVenueIds": [
      "official-news-6e3aabdc7e6ce95e"
    ],
    "eventIds": [
      "bb6164c81a61d85edfb6",
      "70fea3e05c293d22ff25"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.ksponco.or.kr/olympicpark/menu.es?mid=a20301031000"
    ]
  },
  {
    "id": "paradise-city-incheon",
    "name": "仁川パラダイスシティ",
    "aliases": [
      "パラダイスシティ",
      "インチョンパラダイスシティ",
      "いんちょんぱらだいすしてぃ"
    ],
    "eventVenueNames": [
      "仁川パラダイスシティ"
    ],
    "eventVenueIds": [
      "official-news-fdedbd975be3eab8"
    ],
    "eventIds": [
      "43b6e90e61e065524a31",
      "1862d3512a87cc17936b"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://cdn.imweb.me/upload/S20260514ec9937937627b/7a8db9864852d.jpg",
      "https://xmfestivalen.imweb.me/map"
    ]
  },
  {
    "id": "a-nation-odaiba",
    "name": "お台場 a-nation特設会場",
    "aliases": [
      "オダイバエーネーショントクセツカイジョウ",
      "おだいばえーねーしょんとくせつかいじょう"
    ],
    "eventVenueNames": [
      "お台場 a-nation特設会場"
    ],
    "eventVenueIds": [
      "official-news-5b7f79bf6a6ca224"
    ],
    "eventIds": [
      "7641b842cea9ab48c66d"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "ambiguous",
    "sourceUrls": [
      "https://www.a-nation.net/"
    ]
  },
  {
    "id": "odaiba-event-area",
    "name": "東京・お台場",
    "aliases": [
      "お台場",
      "トウキョウオダイバ",
      "とうきょうおだいば"
    ],
    "eventVenueNames": [
      "東京・お台場"
    ],
    "eventVenueIds": [
      "official-news-175d39e15ef67ee3"
    ],
    "eventIds": [
      "50c7224abc8d9f60a9e4",
      "0c228692da2a0ce9acd8",
      "42ed36b6d81a222b7a72"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "ambiguous",
    "sourceUrls": [
      "https://storage.googleapis.com/studio-design-asset-files/projects/rROnbNDkOA/s-2000x2000_v-frms_webp_7657a3e2-c2d4-4207-88eb-34e2b6b496ba_small.webp",
      "https://bmsgfes.tokyo/livereport"
    ]
  },
  {
    "id": "honda-no-mori",
    "name": "本多の森北電ホール",
    "aliases": [
      "本多の森ホール",
      "ホンダノモリホクデンホール",
      "ほんだのもりほくでんほーる"
    ],
    "eventVenueNames": [
      "本多の森北電ホール"
    ],
    "eventVenueIds": [
      "official-news-9a9ef9196293c080"
    ],
    "eventIds": [
      "99809ddc0028a806cf23"
    ],
    "prefecture": "石川県",
    "region": "北陸・甲信越",
    "locality": "金沢市",
    "kind": "venue",
    "sourceUrls": [
      "http://www.hondanomori-hall.com/pdf/hall.pdf",
      "https://www.fobkikaku.co.jp/hall.php?hid=5&mode=pc"
    ]
  },
  {
    "id": "kobe-kokusai",
    "name": "神戸国際会館 こくさいホール",
    "aliases": [
      "兵庫県・神戸国際会館 こくさいホール",
      "神戸国際会館",
      "コウベコクサイカイカン コクサイホール",
      "こうべこくさいかいかん こくさいほーる"
    ],
    "eventVenueNames": [
      "兵庫県・神戸国際会館 こくさいホール"
    ],
    "eventVenueIds": [
      "official-news-2e3ae6acaff3a7dd"
    ],
    "eventIds": [
      "7e4b13c316dd44bc611d"
    ],
    "prefecture": "兵庫県",
    "region": "関西",
    "locality": "神戸市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.kih.co.jp/kokusaihall/facilities/index"
    ]
  },
  {
    "id": "zepp-yokohama",
    "name": "KT Zepp Yokohama",
    "aliases": [
      "Zepp横浜",
      "ケーティーゼップヨコハマ",
      "けーてぃーぜっぷよこはま"
    ],
    "eventVenueNames": [
      "KT Zepp Yokohama"
    ],
    "eventVenueIds": [
      "official-news-7fdc985fc00fb7ba"
    ],
    "eventIds": [
      "8a9e08ca7ea738740c26"
    ],
    "prefecture": "神奈川県",
    "region": "関東",
    "locality": "横浜市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.zepp.co.jp/~pj-zepp/wordpress/wp-content/uploads/2020/10/15003228/yk_seat.pdf",
      "https://www.zepp.co.jp/hall/yokohama/"
    ]
  },
  {
    "id": "sumida-sunrise",
    "name": "すみだ産業会館 サンライズホール",
    "aliases": [
      "東京・すみだ産業会館 サンライズホール",
      "すみだ産業会館",
      "スミダサンギョウカイカン サンライズホール",
      "すみださんぎょうかいかん さんらいずほーる"
    ],
    "eventVenueNames": [
      "東京・すみだ産業会館 サンライズホール"
    ],
    "eventVenueIds": [
      "official-news-dd45ea0df1cd7bc3"
    ],
    "eventIds": [
      "bd84ec8bf17d747fa9a1"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://nearly-equal-joy.jp/news/detail/4007",
      "https://www.sumidasangyoukaikan.jp/organizar/document/"
    ]
  },
  {
    "id": "kumamoto-jo-hall",
    "name": "熊本城ホール メインホール",
    "aliases": [
      "熊本城ホール",
      "クマモトジョウホール メインホール",
      "くまもとじょうほーる めいんほーる"
    ],
    "eventVenueNames": [
      "熊本城ホール メインホール"
    ],
    "eventVenueIds": [
      "official-news-0798c0d55fba693c"
    ],
    "eventIds": [
      "2041698cbbcf59e5030a"
    ],
    "prefecture": "熊本県",
    "region": "九州・沖縄",
    "locality": "熊本市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.kumamoto-jo-hall.jp/pdf/mainsheetnamber.pdf",
      "https://www.kumamoto-jo-hall.jp/organizer/documents.html"
    ]
  },
  {
    "id": "zepp-nagoya",
    "name": "Zepp Nagoya",
    "aliases": [
      "Zepp名古屋",
      "ゼップナゴヤ",
      "ぜっぷなごや"
    ],
    "eventVenueNames": [
      "Zepp Nagoya"
    ],
    "eventVenueIds": [
      "official-news-364c0a5feaf04106"
    ],
    "eventIds": [
      "484f119e2b0bc1c231b3"
    ],
    "prefecture": "愛知県",
    "region": "東海",
    "locality": "名古屋市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.zepp.co.jp/~pj-zepp/wordpress/wp-content/uploads/2018/11/21145421/ng_seat.pdf",
      "https://www.zepp.co.jp/hall/nagoya/"
    ]
  },
  {
    "id": "zepp-osaka",
    "name": "Zepp Osaka Bayside",
    "aliases": [
      "Zepp大阪ベイサイド",
      "ゼップオオサカベイサイド",
      "ぜっぷおおさかべいさいど"
    ],
    "eventVenueNames": [
      "Zepp Osaka Bayside"
    ],
    "eventVenueIds": [
      "official-news-7afa1206d7066d5f"
    ],
    "eventIds": [
      "70cc4d9a4a7c5486f333"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.zepp.co.jp/~pj-zepp/wordpress/wp-content/uploads/2018/11/21153535/bs_seat.pdf",
      "https://www.zepp.co.jp/hall/osakabayside/"
    ]
  },
  {
    "id": "miyagi-electron",
    "name": "東京エレクトロンホール宮城 大ホール",
    "aliases": [
      "宮城県・東京エレクトロンホール宮城 大ホール",
      "東京エレクトロンホール宮城",
      "宮城県民会館",
      "トウキョウエレクトロンホールミヤギ ダイホール",
      "とうきょうえれくとろんほーるみやぎ だいほーる"
    ],
    "eventVenueNames": [
      "宮城県・東京エレクトロンホール宮城 大ホール"
    ],
    "eventVenueIds": [
      "official-news-4797f25d61a702ba"
    ],
    "eventIds": [
      "3b1db8d3bfc7e65285fb"
    ],
    "prefecture": "宮城県",
    "region": "北海道・東北",
    "locality": "仙台市",
    "kind": "venue",
    "sourceUrls": [
      "https://miyagi-hall.jp/guide/drawing/"
    ]
  },
  {
    "id": "pacifico-exhibition-d",
    "name": "パシフィコ横浜 展示ホールD",
    "aliases": [
      "パシフィコ横浜",
      "パシフィコヨコハマ テンジホールディー",
      "ぱしふぃこよこはま てんじほーるでぃー"
    ],
    "eventVenueNames": [
      "パシフィコ横浜 展示ホールD"
    ],
    "eventVenueIds": [
      "official-news-b9a7be8d9bdf526d"
    ],
    "eventIds": [
      "51c49fb6fa4d5b0e51d7"
    ],
    "prefecture": "神奈川県",
    "region": "関東",
    "locality": "横浜市",
    "kind": "venue",
    "sourceUrls": [
      "https://cutiestreet.asobisystem.com/news/detail/93713",
      "https://plan.pacifico.co.jp/",
      "https://www.pacifico.co.jp/access"
    ]
  },
  {
    "id": "nationwide-cinemas",
    "name": "全国各地の映画館",
    "aliases": [
      "全国の映画館",
      "ゼンコクカクチノエイガカン",
      "ぜんこくかくちのえいがかん"
    ],
    "eventVenueNames": [
      "全国各地の映画館"
    ],
    "eventVenueIds": [
      "official-news-72fe95ea8d89be51"
    ],
    "eventIds": [
      "7da2d74f7049f354b363"
    ],
    "prefecture": null,
    "region": null,
    "locality": null,
    "kind": "multiple-venues",
    "sourceUrls": [
      "https://liveviewing.jp/exo-planet6/",
      "https://exo-jp.net/news/detail.php?id=1136599"
    ]
  },
  {
    "id": "zepp-divercity",
    "name": "Zepp DiverCity (TOKYO)",
    "aliases": [
      "Zepp Diver City",
      "ゼップダイバーシティトウキョウ",
      "ゼップダイバーシティ",
      "ぜっぷだいばーしてぃとうきょう",
      "ぜっぷだいばーしてぃ"
    ],
    "eventVenueNames": [
      "Zepp Diver City"
    ],
    "eventVenueIds": [
      "official-news-0a415d9348139657"
    ],
    "eventIds": [
      "498eeeb6198ec91a3c0c"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.zepp.co.jp/~pj-zepp/wordpress/wp-content/uploads/2018/11/21143732/dc_seat.pdf",
      "https://www.zepp.co.jp/hall/divercity/"
    ]
  },
  {
    "id": "abeno-qsmall",
    "name": "あべのキューズモール 3Fスカイコート",
    "aliases": [
      "大阪・あべのキューズモール 3Fスカイコート",
      "あべのキューズモール",
      "アベノキューズモール サンカイスカイコート",
      "あべのきゅーずもーる さんかいすかいこーと"
    ],
    "eventVenueNames": [
      "大阪・あべのキューズモール 3Fスカイコート"
    ],
    "eventVenueIds": [
      "official-news-cf7e5d6208e4dde1"
    ],
    "eventIds": [
      "90ca239e1e78d7d3226b"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "kind": "venue",
    "sourceUrls": [
      "https://nearly-equal-joy.jp/news/detail/4007",
      "https://qs-mall.jp/abeno/theme/abenoqsmall/assets/pdf/ev_space_260217.pdf"
    ]
  },
  {
    "id": "aeon-odaka",
    "name": "イオンモール大高 1Fグリーンコート",
    "aliases": [
      "愛知・イオンモール大高 1Fグリーンコート",
      "イオンモール大高",
      "イオンモールオオダカ イッカイグリーンコート",
      "いおんもーるおおだか いっかいぐりーんこーと"
    ],
    "eventVenueNames": [
      "愛知・イオンモール大高 1Fグリーンコート"
    ],
    "eventVenueIds": [
      "official-news-e82395359b906a40"
    ],
    "eventIds": [
      "362bf3a44e9dfc36a79c"
    ],
    "prefecture": "愛知県",
    "region": "東海",
    "locality": "名古屋市",
    "kind": "venue",
    "sourceUrls": [
      "https://nearly-equal-joy.jp/news/detail/4007",
      "https://www.aeon.jp/sc/odaka/info/info_saiji/",
      "https://www.aeon.jp/sc/odaka/"
    ]
  },
  {
    "id": "lalaport-sakai",
    "name": "ららぽーと堺 Fansta XROSS STADIUM",
    "aliases": [
      "ららぽーと堺 １F Fansta XROSS STADIUM",
      "ららぽーと堺",
      "ララポートサカイ ファンスタクロススタジアム",
      "ららぽーとさかい ふぁんすたくろすすたじあむ"
    ],
    "eventVenueNames": [
      "ららぽーと堺 １F Fansta XROSS STADIUM"
    ],
    "eventVenueIds": [
      "official-news-d59e6ba834ef3d31"
    ],
    "eventIds": [
      "40e8ca9ab157c26ae2b3"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "堺市",
    "kind": "venue",
    "sourceUrls": [
      "https://ano-official.com/news/detail/94065",
      "https://mitsui-shopping-park.com/lalaport/sakai/special/2307-eventportal/about/"
    ]
  },
  {
    "id": "access-sapporo",
    "name": "アクセスサッポロ",
    "aliases": [
      "あくせすさっぽろ"
    ],
    "eventVenueNames": [
      "アクセスサッポロ"
    ],
    "eventVenueIds": [
      "official-news-00085c04ac7450de"
    ],
    "eventIds": [
      "cf6a74e145406480f7a1"
    ],
    "prefecture": "北海道",
    "region": "北海道・東北",
    "locality": "札幌市",
    "kind": "venue",
    "sourceUrls": [
      "https://cutiestreet.asobisystem.com/news/detail/95071q",
      "https://cutiestreet.asobisystem.com/live_information/schedule/list/",
      "https://www.axes.or.jp/pdf/guide_2025.pdf"
    ]
  },
  {
    "id": "gmesse-gunma",
    "name": "Gメッセ群馬",
    "aliases": [
      "ジーメッセグンマ",
      "じーめっせぐんま"
    ],
    "eventVenueNames": [
      "Gメッセ群馬"
    ],
    "eventVenueIds": [
      "official-news-890dfbf466a166c8"
    ],
    "eventIds": [
      "be9893d3efec7d1de348"
    ],
    "prefecture": "群馬県",
    "region": "関東",
    "locality": "高崎市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.g-messe-gunma.jp/organizer-facilities-figure.html#F03",
      "https://www.g-messe-gunma.jp/visitor-facilities-capacity.html"
    ]
  },
  {
    "id": "bellesalle-shibuya",
    "name": "ベルサール渋谷ガーデン",
    "aliases": [
      "ベルサールシブヤガーデン",
      "べるさーるしぶやがーでん"
    ],
    "eventVenueNames": [
      "ベルサール渋谷ガーデン"
    ],
    "eventVenueIds": [
      "official-news-fd619e10408926ff"
    ],
    "eventIds": [
      "ba9ac4c87c2c16cc30dd"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://skz-stayjapan.com/s/n104/news/detail/13266",
      "https://www.bellesalle.co.jp/download/bs_shibuyagarden/"
    ]
  },
  {
    "id": "ariake-central-b",
    "name": "有明セントラルタワーホール＆カンファレンス ホールB",
    "aliases": [
      "有明セントラルタワーホール",
      "アリアケセントラルタワーホールアンドカンファレンス ホールビー",
      "ありあけせんとらるたわーほーるあんどかんふぁれんす ほーるびー"
    ],
    "eventVenueNames": [
      "有明セントラルタワーホール＆カンファレンス ホールB"
    ],
    "eventVenueIds": [
      "official-news-f467931c2f58eed9"
    ],
    "eventIds": [
      "bbf23809fa0a4c58a464"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://ariake-hall.jp/overview-hall/hall-b/"
    ]
  },
  {
    "id": "toyota-arena-tokyo",
    "name": "TOYOTA ARENA TOKYO",
    "aliases": [
      "トヨタアリーナ東京",
      "トヨタアリーナトウキョウ",
      "とよたありーなとうきょう"
    ],
    "eventVenueNames": [
      "TOYOTA ARENA TOKYO"
    ],
    "eventVenueIds": [
      "official-news-d7958347e1c9ef9c"
    ],
    "eventIds": [
      "2eb0b9ffccb3ba7be2f7"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://www.toyota-arena-tokyo.jp/about-the-arena/main-arena/seat-map/"
    ]
  },
  {
    "id": "makuhari-all-halls",
    "name": "幕張メッセ国際展示場1～11ホール・イベントホール",
    "aliases": [
      "マクハリメッセコクサイテンジジョウ イチカラジュウイチホール イベントホール",
      "まくはりめっせこくさいてんじじょう いちからじゅういちほーる いべんとほーる"
    ],
    "eventVenueNames": [
      "幕張メッセ国際展示場1～11ホール・イベントホール"
    ],
    "eventVenueIds": [
      "official-news-8e38d83637bb0e7d"
    ],
    "eventIds": [
      "05b905c7e23b5e1d59eb"
    ],
    "prefecture": "千葉県",
    "region": "関東",
    "locality": "千葉市",
    "kind": "multiple-venues",
    "sourceUrls": [
      "https://countdownjapan.s3.amazonaws.com/2627/img/cdj_top_map.png",
      "https://countdownjapan.jp/"
    ]
  },
  {
    "id": "port-hall",
    "name": "東京ポートシティ竹芝 ポートホール",
    "aliases": [
      "ポートホール",
      "トウキョウポートシティタケシバ ポートホール",
      "とうきょうぽーとしてぃたけしば ぽーとほーる"
    ],
    "eventVenueNames": [
      "東京ポートシティ竹芝 ポートホール"
    ],
    "eventVenueIds": [
      "official-news-eda06a7c83323363"
    ],
    "eventIds": [
      "5b369e9139d9708a4d62"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://portcity-hall.tokyo/facility/port-hall/"
    ]
  },
  {
    "id": "crystal-hall",
    "name": "梅田クリスタルホール",
    "aliases": [
      "ウメダクリスタルホール",
      "うめだくりすたるほーる"
    ],
    "eventVenueNames": [
      "梅田クリスタルホール"
    ],
    "eventVenueIds": [
      "official-news-6b9fce98a362ef79"
    ],
    "eventIds": [
      "1bfaa106db490d25949e"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.ucb.co.jp/wp/wp-content/themes/ucb/images/crystal-chargese-quipment/projector_2024.pdf"
    ]
  },
  {
    "id": "fuchu-dream",
    "name": "府中の森芸術劇場 どりーむホール",
    "aliases": [
      "府中の森芸術劇場",
      "フチュウノモリゲイジュツゲキジョウ ドリームホール",
      "ふちゅうのもりげいじゅつげきじょう どりーむほーる"
    ],
    "eventVenueNames": [
      "府中の森芸術劇場 どりーむホール"
    ],
    "eventVenueIds": [
      "official-news-0c9e0212e20721d9"
    ],
    "eventIds": [
      "f7195a739070b7f8868e"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": "府中市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.fuchu-cpf.or.jp/theater/1000160/1000175.html"
    ]
  },
  {
    "id": "waikiki-shell",
    "name": "TOM MOFFATT WAIKIKI SHELL",
    "aliases": [
      "ワイキキシェル",
      "Waikiki Shell",
      "トムモファットワイキキシェル",
      "とむもふぁっとわいききしぇる"
    ],
    "eventVenueNames": [
      "TOM MOFFATT WAIKIKI SHELL"
    ],
    "eventVenueIds": [
      "official-news-1bbadd4be5a8c4ec"
    ],
    "eventIds": [
      "cbcaf1d2a37064b16427"
    ],
    "prefecture": null,
    "region": "海外",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://blaisdellcenter.com/wp-content/uploads/2026/04/Waikiki-Shell-Amphitheater-v2.pdf"
    ]
  },
  {
    "id": "hulic-hall",
    "name": "HULIC HALL TOKYO",
    "aliases": [
      "ヒューリックホール東京",
      "ヒューリックホールトウキョウ",
      "ひゅーりっくほーるとうきょう"
    ],
    "eventVenueNames": [
      "HULIC HALL TOKYO"
    ],
    "eventVenueIds": [
      "official-news-6e4bb185701ee424"
    ],
    "eventIds": [
      "06ef90e7f011f904336c"
    ],
    "prefecture": "東京都",
    "region": "関東",
    "locality": null,
    "kind": "venue",
    "sourceUrls": [
      "https://hulic-theater.com/wordpress/wp-content/themes/mgs-yht/pdf/layout/seating_chart.pdf"
    ]
  },
  {
    "id": "sankei-breeze",
    "name": "サンケイホールブリーゼ",
    "aliases": [
      "SANKEI HALL BREEZÉ",
      "さんけいほーるぶりーぜ"
    ],
    "eventVenueNames": [
      "SANKEI HALL BREEZÉ"
    ],
    "eventVenueIds": [
      "official-news-4916d9712d655a5d"
    ],
    "eventIds": [
      "6dd9638554c74c93beab"
    ],
    "prefecture": "大阪府",
    "region": "関西",
    "locality": "大阪市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.sankeihallbreeze.com/hall/seat/"
    ]
  },
  {
    "id": "amano-nagoya",
    "name": "アマノ芸術創造センター名古屋",
    "aliases": [
      "Amano Performing Arts Center Nagoya (Nagoya City Arts Creation Center)",
      "名古屋市芸術創造センター",
      "アマノゲイジュツソウゾウセンターナゴヤ",
      "あまのげいじゅつそうぞうせんたーなごや"
    ],
    "eventVenueNames": [
      "Amano Performing Arts Center Nagoya (Nagoya City Arts Creation Center)"
    ],
    "eventVenueIds": [
      "official-news-68baf51af0a367c9"
    ],
    "eventIds": [
      "ad32a8b9f8020af9052e"
    ],
    "prefecture": "愛知県",
    "region": "東海",
    "locality": "名古屋市",
    "kind": "venue",
    "sourceUrls": [
      "https://www.bunka758.or.jp/facility/geijutsusouzou/files/pdf/kyakuseki_kihon_a.pdf",
      "https://www.bunka758.or.jp/facility/geijutsusouzou/document/"
    ]
  }
];
