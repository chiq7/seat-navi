import Link from "next/link";
import { Megaphone } from "lucide-react";
import SiteNewsList from "@/components/news/SiteNewsList";
import { SITE_NEWS } from "@/lib/siteNews";

export default function SiteNewsSection() {
  // TOPは導線を増やしすぎないため、最新のお知らせ1件だけを表示する。
  // 2件目以降は「一覧を見る」から確認できる。
  const latestPosts = SITE_NEWS.slice(0, 1);
  if (latestPosts.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-gray-900">
          <Megaphone size={16} color="#FF6B9D" aria-hidden="true" />
          ちけレポからのお知らせ
        </h2>
        <Link href="/news" className="text-[11px] font-bold text-[#D94878] no-underline">
          一覧を見る
        </Link>
      </div>
      <div className="mx-4">
        <SiteNewsList posts={latestPosts} compact />
      </div>
    </section>
  );
}
