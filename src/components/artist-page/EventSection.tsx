import Link from "next/link";

export type VenueGroup = {
  venue: string;
  dates: string[];       // "YYYY-MM-DD" sorted ascending
  totalReports: number;
  eventId: string | null;
};

type Props = {
  venueGroups: VenueGroup[];
};

function fmtMD(d: string): string {
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
}

export default function EventSection({ venueGroups }: Props) {
  return (
    <section className="mt-3 px-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[22px] font-bold leading-none text-gray-900">公演データ</h2>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 hide-scrollbar">
        {venueGroups.length > 0 ? (
          venueGroups.map((group) => {
            const cardClassName = "w-[164px] shrink-0 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm";
            const content = (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold leading-tight text-gray-900">{group.venue}</p>
                <p className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-gray-500">
                  {group.dates.map(fmtMD).join("・")}
                </p>
                <p className="mt-1 text-[13px] font-semibold leading-tight text-gray-900">
                  報告 <span className="font-bold text-[#FF6B9D]">{group.totalReports}件</span>
                </p>
              </div>
            );
            return group.eventId ? (
              <Link key={group.venue} href={`/events/${group.eventId}`} className={`${cardClassName} no-underline active:opacity-80`}>
                {content}
              </Link>
            ) : (
              <article key={group.venue} className={cardClassName}>
                {content}
              </article>
            );
          })
        ) : (
          <p className="py-4 text-sm text-gray-400">公演情報がありません</p>
        )}
      </div>
    </section>
  );
}
