import Link from "next/link";
import { BookOpen, MessageCircle } from "lucide-react";

/** Keep existing destinations without a large carousel above the seat maps. */
export default function HomeHeroPromoBanner() {
  // Two clear actions as buttons, then the featured artists labelled as such (they were bare arrow links before).
  return (
    <nav data-monetization-slot="home-first-view" aria-label="使い方とおすすめアーティスト" className="zr-container py-3">
      <div className="grid grid-cols-2 gap-2">
        <Link href="/news/how-to-use-tixrepo" className={tile}><BookOpen size={18} aria-hidden="true" />使い方を見る</Link>
        <Link href="/report" className={tile}><MessageCircle size={18} aria-hidden="true" />レポを投稿する</Link>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="font-bold text-[#706670]">人気のアーティスト</span>
        <Link href="/artists/seventeen" className={chip}>SEVENTEEN</Link>
        <Link href="/artists/yoasobi" className={chip}>YOASOBI</Link>
      </div>
    </nav>
  );
}

const tile = "zr-focus flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#e9cdd9] bg-white px-3 text-[13px] font-black text-[#a62b59]";
const chip = "zr-focus inline-flex min-h-10 items-center rounded-full border border-[#e9cdd9] bg-white px-3 font-bold text-[#a62b59]";
