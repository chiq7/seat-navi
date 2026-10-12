import type { ReactNode } from "react";
import { Header } from "@/components/common/Header";

type StaticPageProps = {
  title: string;
  children: ReactNode;
};

export default function StaticPage({ title, children }: StaticPageProps) {
  return (
    <div className="community-page pb-10">
      <Header title={title} backHref="/" backLabel="TOPへ戻る" titleAsHeading />
      <main className="mx-auto w-[calc(100%-32px)] max-w-[860px] py-7 sm:py-10">
        <article className="border-y border-[#ded8dc] bg-white px-4 py-6 text-[13px] leading-7 text-[#665a61] sm:px-6 sm:py-8">
          {children}
        </article>
      </main>
    </div>
  );
}
