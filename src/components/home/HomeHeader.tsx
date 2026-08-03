import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { AccountLink } from "@/components/auth/AccountLink";

export default function HomeHeader() {
  return (
    <header className="relative z-50 border-b border-black/10 bg-white">
      <div className="zr-container flex h-[72px] items-center gap-6 md:h-[82px]">
        <Link href="/" className="zr-focus shrink-0 rounded-md">
          <Image src="/images/logo.png" alt="ちけレポ" width={132} height={34} priority className="h-7 w-auto object-contain md:h-8" />
        </Link>

        <nav className="ml-5 hidden items-center gap-8 text-[13px] font-bold text-[#2c252b] lg:flex">
          <Link href="/search" className="transition-colors hover:text-[#f43679]">座席表を探す</Link>
          <Link href="/venues" className="transition-colors hover:text-[#f43679]">会場から探す</Link>
          <Link href="/report" className="transition-colors hover:text-[#f43679]">レポを投稿する</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/search" aria-label="検索" className="zr-focus flex h-11 items-center gap-2 rounded-full border border-[#ded8dc] px-3 text-[12px] font-bold text-[#5d555b] transition hover:border-[#f43679] sm:px-5">
            <Search size={17} />
            <span className="hidden sm:inline">アーティスト・会場を検索</span>
          </Link>
          <AccountLink className="shrink-0" />
        </div>
      </div>
    </header>
  );
}
