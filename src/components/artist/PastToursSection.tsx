import Link from "next/link";

type PastTour = {
  title: string;
  years: string[];
  venues: string[];
  firstEventId: string;
};

export function PastToursSection({ loading, pastTours }: { loading: boolean; pastTours: PastTour[] }) {
  return (
    <section className="mt-5 px-4">
      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        過去公演データ
      </h3>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {!loading && pastTours.length > 0 ? (
          pastTours.map((tour, i) => (
            <Link
              key={tour.firstEventId}
              href={`/events/${tour.firstEventId}`}
              className={`flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors group ${
                i < pastTours.length - 1 ? "border-b border-gray-50" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-bold" style={{ color: "#006876" }}>
                  {[...tour.years].sort().join("・")}
                </p>
                <h4 className="mt-0.5 line-clamp-1 text-sm font-semibold text-gray-800">
                  {tour.title}
                </h4>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {tour.venues.slice(0, 3).join(" ﾂｷ ")}
                  {tour.venues.length > 3 ? " 他" : ""}
                </p>
              </div>
              <svg
                className="ml-2 h-4 w-4 shrink-0 text-gray-300 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">
              {loading ? "読み込み中..." : "過去公演データなし"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
