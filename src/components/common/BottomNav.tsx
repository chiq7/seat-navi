"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Camera, LayoutGrid, ListMusic, Map, SquarePen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ActiveTab = "artist" | "report" | "event" | "after-report" | "setlist";

type Props = {
  active: ActiveTab;
  artistSlug?: string;
  eventId?: string;
};

const PINK = "#FF6B9D";
const GRAY = "#9CA3AF";

function Item({
  href,
  isActive,
  label,
  Icon,
}: {
  href: string | null;
  isActive: boolean;
  label: string;
  Icon: LucideIcon;
}) {
  const color = isActive ? PINK : GRAY;
  const inner = (
    <>
      <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
      <span
        className={`text-[9px] ${isActive ? "font-black" : "font-bold"}`}
        style={{ color }}
      >
        {label}
      </span>
    </>
  );

  const itemClassName = `zr-focus flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 transition-colors ${
    isActive ? "bg-[#fff0f5]" : "hover:bg-[#fff9fb]"
  }`;

  if (href === null) {
    return (
      <div className={`${itemClassName} cursor-default opacity-30`} style={{ color }}>
        {inner}
      </div>
    );
  }
  return (
    <Link href={href} className={itemClassName} style={{ color }}>
      {inner}
    </Link>
  );
}

export function BottomNav({ active, artistSlug, eventId }: Props) {
  const router = useRouter();
  const artistHref = artistSlug ? `/artists/${artistSlug}` : "/";
  const seatHref = eventId ? `/events/${eventId}` : null;
  const afterHref = artistSlug ? `/artists/${artistSlug}/after-reports` : null;
  const setlistHref = artistSlug ? `/artists/${artistSlug}/setlist` : null;
  const reportHref = eventId
    ? `/report?event=${eventId}${artistSlug ? `&artist=${artistSlug}` : ""}`
    : artistSlug
      ? `/report?artist=${artistSlug}`
      : "/report";

  // 常に表示されるナビは、次に使う主要画面を先読みしてタップ後の空白を作らない。
  useEffect(() => {
    [artistHref, reportHref, seatHref, afterHref, setlistHref]
      .filter((href): href is string => href !== null)
      .forEach((href) => router.prefetch(href));
  }, [afterHref, artistHref, reportHref, router, seatHref, setlistHref]);

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 flex min-h-[72px] w-full max-w-[620px] -translate-x-1/2 items-center rounded-t-[24px] border border-[#f0dfe6] bg-white/95 px-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_35px_rgba(105,63,80,0.09)] backdrop-blur-xl md:bottom-5 md:rounded-[24px] md:pb-0 lg:relative lg:bottom-auto lg:left-auto lg:z-auto lg:mx-auto lg:mt-10 lg:translate-x-0 lg:bg-white lg:shadow-[0_10px_30px_rgba(105,63,80,0.07)]"
      aria-label="ページ内ナビゲーション"
    >
      <div className="flex w-full items-center justify-around gap-0.5">
        <Item
          href={artistHref}
          isActive={active === "artist"}
          label="アーティスト"
          Icon={LayoutGrid}
        />
        <Item
          href={reportHref}
          isActive={active === "report"}
          label="報告"
          Icon={SquarePen}
        />
        <Item
          href={seatHref}
          isActive={active === "event"}
          label="座席予想"
          Icon={Map}
        />
        <Item
          href={afterHref}
          isActive={active === "after-report"}
          label="現地レポ"
          Icon={Camera}
        />
        <Item
          href={setlistHref}
          isActive={active === "setlist"}
          label="セトリ"
          Icon={ListMusic}
        />
      </div>
    </nav>
  );
}
