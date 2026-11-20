import seatViewPostData from "@/data/seatViewPosts.json";
import { reviewedSeatPhotos } from "@/lib/seatViewPhotoAssets";

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
};

// Only reviewed posts are included. Seat IDs belong to a single diagram.
const postsByDiagram = seatViewPostData as Readonly<Record<string, readonly SeatViewPost[]>>;
const reviewedPostsByDiagram = Object.fromEntries(Object.entries(postsByDiagram).map(([diagram, posts]) => [
  diagram, reviewedSeatPhotos(posts, post => JSON.stringify([
    post.place.kind, post.place.id, post.row, post.seat, post.seatVerified, post.scope,
  ])),
]));

export function seatViewPosts(diagram: string): readonly SeatViewPost[] {
  return Object.hasOwn(reviewedPostsByDiagram, diagram) ? reviewedPostsByDiagram[diagram] : [];
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

export function seatViewMatchesForSelection(posts: readonly SeatViewPost[], selection: SeatViewSelection) {
  const matches = posts.flatMap<{ post: SeatViewPost; label: NonNullable<ReturnType<typeof seatViewMatch>> }>(post => {
    const label = seatViewMatch(post, selection);
    return label ? [{ post, label }] : [];
  });
  const exact = matches.filter(match => match.label === "同じ座席");
  if (exact.length) return exact;
  const priority = ({ post, label }: (typeof matches)[number]) =>
    label === "同じ列の参考" ? 0 : post.place.kind === "section" ? 1 : 2;
  return matches.sort((a, b) => priority(a) - priority(b));
}
