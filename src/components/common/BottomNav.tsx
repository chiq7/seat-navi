import Link from "next/link";
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
  const artistHref = artistSlug ? `/artists/${artistSlug}` : "/";
  const seatHref = eventId ? `/events/${eventId}` : null;
  const afterHref = artistSlug ? `/artists/${artistSlug}/after-reports` : null;
  const setlistHref = artistSlug ? `/artists/${artistSlug}/setlist` : null;
  const reportHref = eventId
    ? `/report?event=${eventId}`
    : artistSlug
      ? `/report?artist=${artistSlug}`
      : "/report";

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 flex h-[72px] w-full max-w-[620px] -translate-x-1/2 items-center rounded-t-[24px] border border-[#f0dfe6] bg-white/95 px-1.5 shadow-[0_-12px_35px_rgba(105,63,80,0.09)] backdrop-blur-xl md:bottom-5 md:rounded-[24px]"
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
