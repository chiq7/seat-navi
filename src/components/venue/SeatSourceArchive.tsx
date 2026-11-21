import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/common/Header";
import { getSeatSources, seatSourcePermalink, sourceKinds, sourceKindNames, sourcePageHref, sourcePageSize as pageSize, sourcePreviewLimit as previewLimit, type SeatSourceGroup, type SeatSourceKind } from "@/lib/seatSourceArchive";

export { sourcePageHref };
const action = "zr-focus inline-flex min-h-11 items-center rounded-xl border border-[#d5adbd] bg-white px-4 text-sm font-bold text-[#8a2850]";

function SourceCards({ posts, linkEvents, offset = 0 }: { posts: SeatSourceGroup[]; linkEvents: boolean; offset?: number }) {
  return <ul className="mt-2 grid gap-2 sm:grid-cols-2">{posts.map((post, index) =>
    <li key={post.sourceId} data-seat-source={post.sourceId} className="flex min-w-0 flex-col rounded-xl border border-[#eadce1] bg-white p-3">
      {post.rows[0].kind === "arena_map" && posts.length > 1 && <p className="mb-1 text-xs font-bold text-[#713d67]">アリーナ図の投稿{offset + index + 1}</p>}
      <ul className="space-y-2">
        {post.rows.map((row, i) => <li key={i} className="break-words text-sm">
          {row.eventLabel && <p className="mb-0.5 text-xs text-[#68545c]">{linkEvents && row.eventId
            ? <Link href={`/events/${encodeURIComponent(row.eventId)}#seat-source-posts`} prefetch={false} className="zr-focus inline-flex min-h-11 items-center font-bold underline">{row.eventLabel}</Link>
            : row.eventLabel}</p>}
          {row.position && <p className="font-bold text-[#44333d]">{row.position}</p>}
          {row.photoNumber !== null && <span className="text-xs text-[#68545c]">投稿の{row.photoNumber}枚目</span>}
          {row.note && <p className="mt-0.5 leading-6 text-[#584650]">{row.note}</p>}
        </li>)}
      </ul>
      <a className="zr-focus mt-auto inline-flex min-h-11 items-center self-start text-sm font-bold text-[#962852] underline underline-offset-4"
        href={seatSourcePermalink(post.rows[0])} rel="external noopener noreferrer" target="_blank">元のX投稿を見る<span className="sr-only">（新しいタブ）</span></a>
    </li>)}</ul>;
}

/** `kinds` limits the section, e.g. arena maps only where seat posts already show as photos on the page. */
export function SeatSourcePreview({ scope, id, sectionId = "seat-source-posts", kinds = sourceKinds }: { scope: "venues" | "events"; id: string; sectionId?: string; kinds?: readonly SeatSourceKind[] }) {
  const groups = getSeatSources(scope, id);
  if (!kinds.some(kind => groups[kind].length)) return null;
  const only = kinds.length === 1 ? kinds[0] : null;
  const prefix = `/${scope}/${encodeURIComponent(id)}/seat-sources`;
  return <section id={sectionId} aria-labelledby={sectionId + "-title"} className="zr-container scroll-mt-20 py-6">
    <h2 id={sectionId + "-title"} className="artist-heading">{only ? `${sourceKindNames[only]}（${groups[only].length}件）` : `${scope === "venues" ? "この会場" : "この公演"}の座席・アリーナ図の投稿`}</h2>
    {kinds.map(kind => groups[kind].length > 0 && <div key={kind} className={only ? "mt-2" : "mt-4"} data-seat-source-kind={kind} data-post-count={groups[kind].length}>
      {!only && <h3 className="text-sm font-bold">{sourceKindNames[kind]}（{groups[kind].length}件）</h3>}
      {only === "arena_map"
        // One row per event: the row opens the X post that shows that show's arena layout.
        ? <ul className="mt-1 border-t border-[#eadce1]">{groups[kind].slice(0, 4).map(post => <li key={post.sourceId} data-arena-source={post.sourceId} className="border-b border-[#eadce1]">
          <a className="zr-focus flex min-h-[52px] items-center gap-2 py-1 text-sm font-bold text-[#44333d] no-underline" href={seatSourcePermalink(post.rows[0])} rel="external noopener noreferrer" target="_blank">
            <span className="min-w-0 flex-1 truncate">{post.rows[0].eventLabel || post.rows[0].position}</span>
            <span className="shrink-0 rounded-full border border-[#ecd2de] bg-[#fff7fa] px-3 py-1.5 text-xs text-[#96305b]">図を見る ↗<span className="sr-only">（Xの投稿・新しいタブ）</span></span>
          </a></li>)}</ul>
        : <SourceCards posts={groups[kind].slice(0, previewLimit)} linkEvents={scope === "venues"} />}
      {groups[kind].length > (only === "arena_map" ? 4 : previewLimit) && <Link prefetch={false} className={action + " mt-2"} href={`${prefix}?kind=${kind}`}>
        {sourceKindNames[kind]}をすべて見る（{groups[kind].length}件）</Link>}
    </div>)}
  </section>;
}

export type SourceQuery = { page?: string | string[]; kind?: string | string[] };
export function getSourcePage(scope: "venues" | "events", id: string, query: SourceQuery) {
  const kind = query.kind ?? "seat_view";
  const rawPage = query.page ?? "1";
  if ((kind !== "seat_view" && kind !== "arena_map") || typeof rawPage !== "string" || !/^[1-9]\d{0,6}$/.test(rawPage)) notFound();
  const page = Number(rawPage);
  const posts = getSeatSources(scope, id)[kind];
  const pages = Math.ceil(posts.length / pageSize);
  if (page > pages) notFound();
  return { kind, page, posts, pages } as const;
}

export function SeatSourceListPage({ scope, id, name, query }: {
  scope: "venues" | "events"; id: string; name: string; query: SourceQuery;
}) {
  const { kind, page, posts, pages } = getSourcePage(scope,id,query);
  const base = `/${scope}/${encodeURIComponent(id)}`;
  const parents = [...(scope === "venues" ? [{ href: "/venues", label: "ライブ会場一覧" }] : []), { href: base, label: name }];
  return <>
    <Header title={sourceKindNames[kind]} breadcrumbParents={parents} backHref={base + "#seat-source-posts"} backLabel={name + "に戻る"} />
    <main className="zr-container py-6">
      <h1 className="artist-heading">{name}の{sourceKindNames[kind]}</h1>
      <p className="mt-2 text-sm text-[#68545c]">全{posts.length}件のうち{(page-1)*pageSize+1}〜{Math.min(page*pageSize,posts.length)}件</p>
      <SourceCards offset={(page-1)*pageSize} posts={posts.slice((page-1)*pageSize, page*pageSize)} linkEvents={scope === "venues"} />
      {pages > 1 && <nav aria-label="投稿一覧のページ切り替え" className="mt-4 flex flex-wrap items-center gap-3">
        {page > 1 && <Link className={action} prefetch={false} href={sourcePageHref(base,kind,page-1)}>前のページ</Link>}
        <span className="text-sm">{page} / {pages}</span>
        {page < pages && <Link className={action} prefetch={false} href={sourcePageHref(base,kind,page+1)}>次のページ</Link>}
      </nav>}
    </main>
  </>;
}
