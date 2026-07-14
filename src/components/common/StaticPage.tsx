import type { ReactNode } from "react";
import { Header } from "@/components/common/Header";

type StaticPageProps = {
  title: string;
  children: ReactNode;
};

export default function StaticPage({ title, children }: StaticPageProps) {
  return (
    <div className="min-h-screen bg-[#FFF8FB]">
      <Header title={title} backHref="/" />
      <main className="px-3 py-4">
        <article className="rounded-lg border border-pink-100 bg-white px-4 py-5 text-[13px] leading-7 text-gray-700">
          {children}
        </article>
      </main>
    </div>
  );
}
