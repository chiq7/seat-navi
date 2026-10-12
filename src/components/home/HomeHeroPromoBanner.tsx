import Link from "next/link";
import { ArrowUpRight, BookOpen, MessageCircle } from "lucide-react";

/** Keep existing destinations without a large carousel above the seat maps. */
export default function HomeHeroPromoBanner() {
  return (
    <nav data-monetization-slot="home-first-view" aria-label="使い方とおすすめアーティスト" className="zr-container flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[12px] font-bold text-[#a62b59]">
      <Link href="/news/how-to-use-tixrepo" className="zr-focus inline-flex min-h-11 items-center gap-1"><BookOpen size={16} aria-hidden="true" />使い方</Link>
      <Link href="/report" className="zr-focus inline-flex min-h-11 items-center gap-1"><MessageCircle size={16} aria-hidden="true" />レポを投稿</Link>
      <Link href="/artists/seventeen" className="zr-focus inline-flex min-h-11 items-center gap-1">SEVENTEEN<ArrowUpRight size={14} aria-hidden="true" /></Link>
      <Link href="/artists/yoasobi" className="zr-focus inline-flex min-h-11 items-center gap-1">YOASOBI<ArrowUpRight size={14} aria-hidden="true" /></Link>
    </nav>
  );
}
