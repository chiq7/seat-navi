import type { ReactNode } from "react";
import { Header } from "@/components/common/Header";

type StaticPageProps = {
  title: string;
  children: ReactNode;
};

export default function StaticPage({ title, children }: StaticPageProps) {
  return (
    <div className="community-page">
      <Header title={title} backHref="/" />
      <main className="mx-auto w-full max-w-[860px] px-4 py-8 sm:px-6 sm:py-12">
        <article className="community-panel px-5 py-7 text-[13px] leading-7 text-[#665a61] sm:px-8 sm:py-9">
          {children}
        </article>
      </main>
    </div>
  );
}
