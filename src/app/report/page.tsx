import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/common/BottomNav";
import { ReportEventSelector } from "@/components/report/ReportEventSelector";

export default function ReportEntryPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[390px] bg-white pb-28 font-sans text-[#111827]">
      <ReportHero />
      <ReportEventSelector />
      <BottomNav active="report" />
    </main>
  );
}

function ReportHero() {
  return (
    <section className="relative h-[286px] w-full overflow-hidden">
      <Image
        src="/images/report/backgrounds/report-hero-choice-a-bg1.png"
        alt=""
        fill
        priority
        sizes="(max-width: 390px) 100vw, 390px"
        className="object-cover object-[center_62%]"
      />
      <div className="absolute inset-0 bg-white/22" />

      <header className="absolute left-0 right-0 top-0 z-10 flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40"
        >
          <ChevronLeft size={24} strokeWidth={2.5} className="text-[#111827]" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-[18px] font-bold tracking-[0.02em] text-[#111827]">
          報告する
        </h1>
        <div className="h-10 w-10" />
      </header>

      <div className="relative z-10 px-6 pt-[76px] text-center">
        <p className="text-[24px] font-bold leading-[1.45] text-[#111827]">
          あなたの報告が、
          <br />
          次の参戦の<span className="text-[#FF6B9D]">ヒント</span>になる
        </p>
        <p className="mt-3 text-[13px] text-[#374151]">
          当落・座席・現地の様子をみんなで共有しよう
        </p>
      </div>

    </section>
  );
}


