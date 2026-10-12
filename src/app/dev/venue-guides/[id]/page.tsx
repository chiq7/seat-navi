import Link from "next/link";
import { notFound } from "next/navigation";
import VerifiedVenueGuide from "@/components/venue/guides/VerifiedVenueGuide";
import KArenaGuide from "@/components/venue/guides/KArenaGuide";
import ArenaGuide from "@/components/venue/guides/ArenaGuide";
import { dedicatedVenueGuides } from "@/data/venueGuides";
import { venueGuideInventory } from "@/data/venueGuides/inventory";

export default async function VenueGuidePreview({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { id } = await params;
  const item = venueGuideInventory.find(venue => venue.venueId === id);
  if (!item) notFound();
  const guide = dedicatedVenueGuides[id];
  if (id === "toki-messe" || id === "hiroshima-arena" || id === "miyagi-arena" || id === "edion-arena" || id === "nissan-stadium" || id === "makuhari-messe") return <main><div className="zr-container py-4"><Link href="/dev/venue-guides" className="inline-flex min-h-11 items-center text-sm text-accent-dark">← 全26会場の確認一覧</Link></div><ArenaGuide venue={id}/></main>;
  if (id === "k-arena") return <main><div className="zr-container py-4"><Link href="/dev/venue-guides" className="inline-flex min-h-11 items-center text-sm text-accent-dark">← 全26会場の確認一覧</Link></div><KArenaGuide/></main>;
  if (id === "mufg-stadium" || id === "koshien" || id === "zozo-marine" || id === "belluna-dome" || id === "sapporo-dome" || id === "paypay-dome" || id === "vantelin-dome" || id === "yokohama-arena" || id === "osaka-jo-hall" || id === "pia-arena-mm" || id === "tokyo-garden-theater" || id === "saitama-super-arena" || id === "ariake-arena" || id === "budokan" || id === "yoyogi" || id === "gaishi-hall" || id === "marine-messe") return <main><div className="zr-container py-4"><Link href="/dev/venue-guides" className="inline-flex min-h-11 items-center text-sm text-accent-dark">← 全26会場の確認一覧</Link></div><ArenaGuide venue={id}/></main>;
  return <main className={id === "kyocera-dome" ? undefined : "mx-auto max-w-5xl px-4 py-8"}>
    <div className={id === "kyocera-dome" ? "zr-container py-4" : undefined}><Link href="/dev/venue-guides" className="inline-flex min-h-11 items-center text-sm text-accent-dark">← 全26会場の確認一覧</Link></div>
    {id !== "kyocera-dome" && <><p className="mt-5 text-xs font-semibold text-accent-dark">会場ガイドのローカル確認</p><h1 className="my-3 text-2xl font-bold">{item.name}</h1>
    <p className="mb-8 text-sm leading-7 text-gray-600">確認日 {item.checkedAt} ／ 元checkoutへ未統合</p>
    <Link href={`/venues/${id}`} className="mb-6 inline-flex min-h-11 items-center text-accent-dark underline">既存の会場ページを開く →</Link></>}
    {guide ? <VerifiedVenueGuide guide={guide} /> : <section className="rounded-xl border border-divider p-5 text-sm leading-7">
      <h2 className="text-lg font-bold">現在の確認範囲</h2>
      <dl className="mt-4 grid gap-4">{[["座席", item.seatCoverage], ["図", item.imageAvailability], ["駅出口", item.stationExits], ["ゲート", item.gates], ["設備", item.facilities], ["荷物・支払い", item.baggagePayment], ["公演別の条件", item.eventDependency], ["残り", item.blocker]].map(([title, value]) => <div key={title}><dt className="font-semibold">{title}</dt><dd className="text-gray-600">{value}</dd></div>)}</dl>
      <div className="mt-6 flex flex-wrap gap-4">{[[item.officialUrl, item.evidence === "unavailable" ? "確認対象の入口（取得未完）" : "会場の公式入口"], [item.seatUrl, "座席資料"], [item.floorUrl, "フロア資料"], [item.accessUrl, "アクセス資料"]].map(([url, label]) => url && <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-accent-dark underline">{label} ↗</a>)}</div>
    </section>}
  </main>;
}
