import seatViewPostData from "@/data/seatViewPosts.json";

export type SeatViewPlace = {
  kind: "section" | "zone" | "position";
  id: string;
};

export type SeatViewPost = {
  place: SeatViewPlace;
  area: string;
  row?: string;
  seat?: string;
  seatVerified?: boolean;
  scope?: "block" | "entrance" | "area" | "floor";
  photo?: number;
  event?: string;
  url: string;
  source: string;
};

export type SeatViewSelection = {
  diagram: string;
  request: number;
  section?: string | null;
  zone?: string | null;
  position?: string | null;
  row?: string | null;
  seat?: string | null;
  onSelect: (place: SeatViewPlace) => void;
};

// Only reviewed posts are included. Seat IDs belong to a single diagram.
const postsByDiagram = seatViewPostData as Readonly<Record<string, readonly SeatViewPost[]>>;

export function seatViewPosts(diagram: string): readonly SeatViewPost[] {
  return Object.hasOwn(postsByDiagram, diagram) ? postsByDiagram[diagram] : [];
}

export function seatViewMatch(post: SeatViewPost, selection: SeatViewSelection) {
  if (post.place.id !== selection[post.place.kind]) return null;
  if (post.scope === "entrance") return "同じ入口付近の参考";
  if (post.scope === "floor") return "同じ階の参考";
  if (post.scope === "area") return "同じエリアの参考";
  if (post.row && post.row === selection.row) {
    if (post.seatVerified && post.seat && post.seat === selection.seat) return "同じ座席";
    return "同じ列の参考";
  }
  return post.scope === "block" || post.place.kind === "zone" ? "同じブロックの参考" : "同じ区画の参考";
}
