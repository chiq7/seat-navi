import Image from "next/image";
import Link from "next/link";

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
  iconSrc,
}: {
  href: string | null;
  isActive: boolean;
  label: string;
  iconSrc: string;
}) {
  const color = isActive ? PINK : GRAY;
  const inner = (
    <>
      <Image
        src={iconSrc}
        alt=""
        width={60}
        height={60}
        className={`h-[60px] w-[60px] object-contain ${isActive ? "opacity-100" : "opacity-80"}`}
      />
      <span
        className={`hidden text-[10px] ${isActive ? "font-bold" : "font-semibold"}`}
        style={{ color }}
      >
        {label}
      </span>
    </>
  );

  const itemClassName = `flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-0.5 ${
    isActive ? "bg-[#FFF1F6]" : ""
  }`;

  if (href === null) {
    return (
      <div className={`${itemClassName} cursor-default opacity-30`}>
        {inner}
      </div>
    );
  }
  return (
    <Link href={href} className={itemClassName}>
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
      className="fixed bottom-0 left-1/2 z-50 flex h-[72px] w-full max-w-[430px] -translate-x-1/2 items-center border-t border-gray-100 pb-safe"
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}
    >
      <div className="flex w-full items-center justify-around gap-1 px-2">
        <Item
          href={artistHref}
          isActive={active === "artist"}
          label="アーティスト"
          iconSrc="/images/bottom-nav/menu-matome5.png"
        />
        <Item
          href={reportHref}
          isActive={active === "report"}
          label="報告"
          iconSrc="/images/bottom-nav/menu-report5.png"
        />
        <Item
          href={seatHref}
          isActive={active === "event"}
          label="座席予想"
          iconSrc="/images/bottom-nav/menu-seat-prediction5.png"
        />
        <Item
          href={afterHref}
          isActive={active === "after-report"}
          label="現地レポ"
          iconSrc="/images/bottom-nav/menu-live-report5.png"
        />
        <Item
          href={setlistHref}
          isActive={active === "setlist"}
          label="セトリ"
          iconSrc="/images/bottom-nav/menu-setlist5.png"
        />
      </div>
    </nav>
  );
}
