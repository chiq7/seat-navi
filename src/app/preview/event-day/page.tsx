import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventDayPreview from "@/components/event-day/EventDayPreview";
import { EVENT_DAY_QA_CASES, getEventDayQaFixture } from "./qaFixtures";

export const metadata: Metadata = {
  title: "公演当日まとめの見本 | ちけレポ",
  description: "公演当日の時間・ブース・締切を1枚にするローカル見本。",
  robots: { index: false, follow: false },
};

export default async function EventDayPreviewPage({ searchParams }: { searchParams: Promise<{ qa?: string; fail?: string; text?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { qa, fail, text } = await searchParams;
  const fixture = qa ? getEventDayQaFixture(qa) : null;
  if (qa && !fixture) notFound();
  return <>
    {(qa || fail === "once" || text === "200") && <aside aria-label="開発限定QA" style={{ padding: "12px", background: "#fff0f6", color: "#302c35" }}>
      <strong>検証専用・架空データ（公開しない）</strong>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        <a href="/preview/event-day">通常の見本</a>
        {EVENT_DAY_QA_CASES.map(name => <a key={name} href={`?qa=${name}`}>{name}</a>)}
        <a href="?fail=once">保存失敗→再試行</a>
        <a href="?text=200">本文200%</a>
      </nav>
    </aside>}
    <EventDayPreview key={`${qa ?? "default"}-${fail ?? ""}`} day={fixture ?? undefined} failFirstImage={fail === "once"} textScale={text === "200" ? 2 : 1} />
  </>;
}
