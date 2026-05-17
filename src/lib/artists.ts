import type { CrawledEvent } from "./types";

export type Artist = {
  slug: string;
  name: string;
  genre: CrawledEvent["genre"];
  description: string;
  keywords: string[];
  initials: string;
  grad: string;
};

export const ARTISTS: Artist[] = [
  {
    slug: "seventeen",
    name: "SEVENTEEN",
    genre: "kpop",
    description: "SEVENTEENのライブ座席予想・座席報告・答え合わせ・セトリ情報をまとめています。",
    keywords: ["SEVENTEEN", "세븐틴"],
    initials: "SE",
    grad: "from-violet-400 to-purple-600",
  },
  {
    slug: "nogizaka46",
    name: "乃木坂46",
    genre: "female_idol",
    description: "乃木坂46のライブ座席予想・座席報告・答え合わせ・セトリ情報をまとめています。",
    keywords: ["乃木坂46", "乃木坂"],
    initials: "乃",
    grad: "from-pink-400 to-rose-500",
  },
  {
    slug: "hinatazaka46",
    name: "日向坂46",
    genre: "female_idol",
    description: "日向坂46のライブ座席予想・座席報告・答え合わせ・セトリ情報をまとめています。",
    keywords: ["日向坂46", "日向坂"],
    initials: "日",
    grad: "from-orange-300 to-pink-400",
  },
  {
    slug: "arashi",
    name: "嵐",
    genre: "johnnys",
    description: "嵐のライブ座席予想・座席報告・答え合わせ・セトリ情報をまとめています。",
    keywords: ["嵐", "ARASHI"],
    initials: "嵐",
    grad: "from-blue-400 to-indigo-600",
  },
  {
    slug: "bz",
    name: "B'z",
    genre: "other",
    description: "B'zのライブ座席予想・座席報告・答え合わせ・セトリ情報をまとめています。",
    keywords: ["B'z", "Bz"],
    initials: "Bz",
    grad: "from-slate-500 to-gray-700",
  },
  {
    slug: "mr-children",
    name: "Mr.Children",
    genre: "other",
    description: "Mr.Childrenのライブ座席予想・座席報告・答え合わせ・セトリ情報をまとめています。",
    keywords: ["Mr.Children", "ミスチル"],
    initials: "Mr",
    grad: "from-teal-400 to-cyan-600",
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
