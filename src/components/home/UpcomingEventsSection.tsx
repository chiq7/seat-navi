import { Calendar } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";

type UpcomingEventsSectionProps = {
  events: UpcomingEvent[];
};

export default function UpcomingEventsSection({ events }: UpcomingEventsSectionProps) {

  return (
    <section className="mt-3">
      <SectionHeader
        icon={<Calendar size={16} color="#FF6B9D" />}
        title="開催が近い公演"
      />
      <div className="flex w-full gap-2 overflow-x-auto px-3 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>a]:w-[120px]">
        {events.map((item) => (
          <UpcomingEventCard key={item.id} item={item} />
        ))}
        <div className="shrink-0 w-1" />
      </div>
    </section>
  );
}
