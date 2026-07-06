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
  iconPath,
  iconPath2,
}: {
  href: string | null;
  isActive: boolean;
  label: string;
  iconPath: string;
  iconPath2?: string;
}) {
  const color = isActive ? PINK : GRAY;
  const inner = (
    <>
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
        {iconPath2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath2} />}
      </svg>
      <span
        className={`text-[10px] ${isActive ? "font-bold" : "font-semibold"}`}
        style={{ color }}
      >
        {label}
      </span>
    </>
  );

  if (href === null) {
    return (
      <div className="flex cursor-default flex-col items-center gap-0.5 px-2 py-1.5 opacity-30">
        {inner}
      </div>
    );
  }
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 px-2 py-1.5">
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
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-100"
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}
    >
      <div className="flex items-center justify-around px-1 py-2 pb-safe">
        <Item
          href={artistHref}
          isActive={active === "artist"}
          label="アーティスト"
          iconPath="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
        <Item
          href={reportHref}
          isActive={active === "report"}
          label="報告"
          iconPath="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
        <Item
          href={seatHref}
          isActive={active === "event"}
          label="座席予想"
          iconPath="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
        />
        <Item
          href={afterHref}
          isActive={active === "after-report"}
          label="現地レポ"
          iconPath="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          iconPath2="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <Item
          href={setlistHref}
          isActive={active === "setlist"}
          label="セトリ"
          iconPath="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </div>
    </nav>
  );
}
