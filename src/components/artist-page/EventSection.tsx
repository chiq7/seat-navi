import { CalendarDays } from "lucide-react";

const events = [
  { date: "07/12(土)", venue: "東京ドーム", reports: "128件" },
  { date: "07/20(日)", venue: "京セラドーム大阪", reports: "96件" },
  { date: "08/03(月)", venue: "福岡PayPayドーム", reports: "74件" },
];

export default function EventSection() {
  return (
    <section className="mt-3 px-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[22px] font-bold leading-none text-gray-900">公演</h2>
        <a href="#" className="text-[14px] font-bold text-[#FF6B9D]">
          もっと見る
        </a>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 hide-scrollbar">
        {events.map((event) => (
          <article key={event.date} className="grid w-[164px] shrink-0 grid-cols-[32px_1fr] gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <CalendarDays size={25} strokeWidth={2} className="mt-2 text-gray-500" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-tight text-gray-900">{event.date}</p>
              <p className="mt-1 truncate text-[13px] font-bold leading-tight text-gray-900">{event.venue}</p>
              <p className="mt-1 text-[13px] font-semibold leading-tight text-gray-900">
                報告 <span className="font-bold text-[#FF6B9D]">{event.reports}</span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
