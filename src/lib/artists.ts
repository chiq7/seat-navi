import type { CrawledEvent } from "./types";

export type Artist = {
  slug: string;
  name: string;
  genre: CrawledEvent["genre"];
  description: string;
  keywords: string[];
  initials: string;
  grad: string;
  accentColor: string;
  accentDark: string;
};

const DESC = "\u5ea7\u5e2d\u4e88\u60f3\u3001\u5f53\u9078\u7387\u3001\u73fe\u5730\u30ec\u30dd\u3001\u30bb\u30c8\u30ea\u3092\u307e\u3068\u3081\u3066\u3044\u307e\u3059\u3002";

export const ARTISTS: Artist[] = [
  {
    slug: "nogizaka46",
    name: "\u4e43\u6728\u574246",
    genre: "female_idol",
    description: `\u4e43\u6728\u574246\u306e${DESC}`,
    keywords: ["\u4e43\u6728\u574246", "\u4e43\u6728\u5742", "Nogizaka46", "Nogizaka"],
    initials: "\u4e43\u6728",
    grad: "from-violet-400 to-purple-600",
    accentColor: "#7c3aed",
    accentDark: "#5b21b6",
  },
  {
    slug: "sakurazaka46",
    name: "\u6afb\u574246",
    genre: "female_idol",
    description: `\u6afb\u574246\u306e${DESC}`,
    keywords: ["\u6afb\u574246", "\u6afb\u5742", "Sakurazaka46", "Sakurazaka"],
    initials: "\u6afb\u5742",
    grad: "from-pink-300 to-rose-500",
    accentColor: "#e11d48",
    accentDark: "#be123c",
  },
  {
    slug: "niziu",
    name: "NiziU",
    genre: "kpop",
    description: `NiziU\u306e${DESC}`,
    keywords: ["NiziU", "\u30cb\u30b8\u30e5\u30fc"],
    initials: "NZ",
    grad: "from-sky-300 to-cyan-500",
    accentColor: "#0891b2",
    accentDark: "#0e7490",
  },
  {
    slug: "hinatazaka46",
    name: "\u65e5\u5411\u574246",
    genre: "female_idol",
    description: `\u65e5\u5411\u574246\u306e${DESC}`,
    keywords: ["\u65e5\u5411\u574246", "\u65e5\u5411\u5742", "Hinatazaka46", "Hinatazaka"],
    initials: "\u65e5\u5411",
    grad: "from-sky-300 to-blue-500",
    accentColor: "#0284c7",
    accentDark: "#0369a1",
  },
  {
    slug: "snow-man",
    name: "Snow Man",
    genre: "johnnys",
    description: `Snow Man\u306e${DESC}`,
    keywords: ["Snow Man", "SnowMan", "\u30b9\u30ce\u30fc\u30de\u30f3"],
    initials: "SM",
    grad: "from-cyan-300 to-slate-500",
    accentColor: "#0f766e",
    accentDark: "#115e59",
  },
  {
    slug: "stray-kids",
    name: "Stray Kids",
    genre: "kpop",
    description: `Stray Kids\u306e${DESC}`,
    keywords: ["Stray Kids", "StrayKids", "\u30b9\u30ad\u30ba"],
    initials: "SK",
    grad: "from-red-400 to-rose-600",
    accentColor: "#dc2626",
    accentDark: "#991b1b",
  },
  {
    slug: "seventeen",
    name: "SEVENTEEN",
    genre: "kpop",
    description: `SEVENTEEN\u306e${DESC}`,
    keywords: ["SEVENTEEN", "\u30bb\u30d6\u30c1"],
    initials: "SE",
    grad: "from-violet-300 to-pink-400",
    accentColor: "#92A8D1",
    accentDark: "#6b7fb0",
  },
  {
    slug: "sixtones",
    name: "SixTONES",
    genre: "johnnys",
    description: `SixTONES\u306e${DESC}`,
    keywords: ["SixTONES", "\u30b9\u30c8\u30fc\u30f3\u30ba"],
    initials: "ST",
    grad: "from-slate-500 to-zinc-800",
    accentColor: "#334155",
    accentDark: "#1e293b",
  },
  {
    slug: "equal-love",
    name: "\uff1dLOVE",
    genre: "female_idol",
    description: `\uff1dLOVE\u306e${DESC}`,
    keywords: ["\uff1dLOVE", "=LOVE", "\u30a4\u30b3\u30fc\u30eb\u30e9\u30d6", "\u30a4\u30b3\u30e9\u30d6"],
    initials: "\uff1dL",
    grad: "from-pink-300 to-fuchsia-500",
    accentColor: "#db2777",
    accentDark: "#be185d",
  },
  {
    slug: "fruits-zipper",
    name: "FRUITS ZIPPER",
    genre: "female_idol",
    description: `FRUITS ZIPPER\u306e${DESC}`,
    keywords: ["FRUITS ZIPPER", "\u3075\u308b\u3063\u3071\u30fc", "\u30d5\u30eb\u30fc\u30c4\u30b8\u30c3\u30d1\u30fc"],
    initials: "FZ",
    grad: "from-amber-300 to-pink-500",
    accentColor: "#f59e0b",
    accentDark: "#d97706",
  },
];

export function findArtistBySlug(slug: string): Artist | undefined {
  return ARTISTS.find((a) => a.slug === slug);
}

export function findArtistByKeyword(query: string): Artist | undefined {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return undefined;
  return ARTISTS.find((a) =>
    a.keywords.some((kw) => {
      const k = kw.toLowerCase();
      return k === q || k.startsWith(q) || q.startsWith(k);
    })
  );
}
