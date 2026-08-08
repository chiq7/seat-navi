import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { AccountLink } from "@/components/auth/AccountLink";

export default function HomeHeader() {
  return (
    <header className="relative z-50 border-b border-[#f3e3e9] bg-white/95 backdrop-blur">
      <div className="zr-container flex h-[64px] items-center gap-4 md:h-[74px]">
        <Link href="/" className="zr-focus flex min-h-11 shrink-0 items-center rounded-md">
          <Image src="/images/logo.png" alt="ちけレポ" width={132} height={34} priority className="h-7 w-auto object-contain md:h-8" />
        </Link>

        <nav className="ml-4 hidden items-center gap-7 text-[13px] font-bold text-[#554a52] lg:flex">
          <Link href="/search" className="transition-colors hover:text-[#f43679]">座席表を探す</Link>
          <Link href="/venues" className="transition-colors hover:text-[#f43679]">会場から探す</Link>
          <Link href="/report" className="transition-colors hover:text-[#f43679]">レポを投稿する</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/search" aria-label="検索" className="zr-focus flex h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-[#fff2f6] px-3 text-[12px] font-bold text-[#6b5b64] transition hover:bg-[#ffe1ec] sm:px-5">
            <Search size={17} />
            <span className="hidden sm:inline">アーティスト・会場を検索</span>
          </Link>
          <AccountLink className="shrink-0" />
        </div>
      </div>
    </header>
  );
}
