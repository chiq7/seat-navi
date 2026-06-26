import { Calendar } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";

const upcomingEvents: UpcomingEvent[] = [
  { id: "1", artist: "TOMORROW X TOGETHER", date: "6.07(土)", venue: "東京ドーム", count: "2,345" },
  { id: "2", artist: "INI", date: "6.08(日)", venue: "ぴあアリーナMM", count: "1,987" },
  { id: "3", artist: "Snow Man", date: "6.14(土)", venue: "京セラドーム大阪", count: "3,456" },
  { id: "4", artist: "&TEAM", date: "6.15(日)", venue: "横浜アリーナ", count: "1,452" },
  { id: "5", artist: "LE SSERAFIM", date: "6.21(土)", venue: "マリンメッセ福岡", count: "1,268" },
];

export default function UpcomingEventsSection() {
  return (
    <section className="mt-5">
      <SectionHeader
        icon={<Calendar size={16} color="#FF6B9D" />}
        title="開催が近い公演"
      />
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {upcomingEvents.map((item) => (
          <UpcomingEventCard key={item.id} item={item} />
        ))}
        <div className="shrink-0 w-1" />
      </div>
    </section>
  );
}
