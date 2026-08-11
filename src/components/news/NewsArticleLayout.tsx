import type { ReactNode } from "react";
import { Newspaper } from "lucide-react";
import { Header } from "@/components/common/Header";

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
        <Header title="お知らせ" backHref="/news" backLabel="お知らせ一覧へ戻る" />
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
