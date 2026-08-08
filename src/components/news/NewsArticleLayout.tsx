import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Newspaper } from "lucide-react";
import { AccountLink } from "@/components/auth/AccountLink";

type Props = {
  kicker: string;
  title: ReactNode;
  lead: string;
  children: ReactNode;
};

export function NewsArticleLayout({ kicker, title, lead, children }: Props) {
  return (
    <main className="community-page pb-16">
      <section className="community-hero">
        <header className="zr-container flex h-16 items-center justify-between">
          <Link href="/news" aria-label="お知らせ一覧へ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-[#51454c] shadow-sm"><ChevronLeft size={26} /></Link>
          <AccountLink iconSize={22} />
        </header>
        <div className="zr-container pb-11 pt-5 sm:pb-16 sm:pt-9">
          <Newspaper size={28} strokeWidth={1.6} className="text-[#ff5b96]" aria-hidden="true" />
          <p className="mt-6 text-[10px] font-black tracking-[0.22em] text-[#ff5b96]">{kicker}</p>
          <h1 className="mt-3 max-w-3xl text-[36px] font-black leading-[1.18] tracking-[-0.05em] sm:text-[58px]">{title}</h1>
          <p className="mt-5 max-w-2xl text-[12px] font-bold leading-6 text-[#76656f] sm:text-[14px]">{lead}</p>
        </div>
      </section>
      <article className="zr-container py-9 sm:py-14">{children}</article>
    </main>
  );
}
