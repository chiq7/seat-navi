"use client";

import { Radio } from "lucide-react";
import { BottomNav } from "@/components/common/BottomNav";
import { CompactEventPickerSection } from "@/components/common/CompactEventPickerSection";
import { CompactHeroIntro } from "@/components/common/CompactHeroIntro";
import { Header } from "@/components/common/Header";
import { ReportEventSelector } from "@/components/report/ReportEventSelector";

/**
 * RSC遷移中でも、投稿先を選ぶ画面を即座に見せる。
 * 公演が届いた後に同じレイアウトの実ページへ置き換わるため、白画面やリングを見せない。
 */
export default function ReportLoading() {
  return (
    <main className="community-page pb-20 font-sans">
      <section className="community-hero relative w-full overflow-hidden">
        <Header title="報告" backHref="/" backLabel="TOPへ戻る" />
        <CompactHeroIntro
          eyebrow="SHARE THE LIVE"
          title="ライブを"
          accent="報告する"
          subtitle="当落・座席・現地情報を共有"
          icon={<Radio size={21} strokeWidth={1.8} className="text-[#ef4f87]" />}
          className="relative z-10"
        />
      </section>
      <CompactEventPickerSection
        headingId="report-event-loading-title"
        title="報告する公演"
        side={<Radio size={19} strokeWidth={1.8} className="text-[#f43679]" aria-hidden="true" />}
        events={[]}
        selectedEventId={null}
        onSelect={() => undefined}
        loading
        eyebrow="SELECT YOUR LIVE"
        includeTitle
      />
      <ReportEventSelector selectedEvent={null} artistName={null} artistSlug={null} />
      <BottomNav active="report" />
    </main>
  );
}
