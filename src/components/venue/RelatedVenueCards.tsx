import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getRelatedSeatGuides } from "@/lib/relatedVenues";
import { getVenuePhotoCounts } from "@/lib/serverSeatPhotoVenues";

export default function RelatedVenueCards({ venueId }: { venueId: string }) {
  const venues = getRelatedSeatGuides(venueId);
  if (!venues.length) return null;
  const counts = getVenuePhotoCounts();
  return (
    <nav aria-labelledby="related-venues-title" className="border-t border-[#eadfe4] py-6 sm:py-8">
      <h2 id="related-venues-title" className="text-lg font-black leading-snug text-[#4b4148]">同じエリア・同規模のライブ会場の座席表を見る</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {venues.map(venue => (
          <li key={venue.id}>
            <Link href={venue.href} prefetch={false} data-related-venue={venue.id}
              className="zr-focus flex min-h-14 items-center justify-between gap-3 rounded-xl border border-[#e8d5de] bg-white px-4 py-2.5 text-[#622f49] hover:bg-[#fff6fa]">
              <span className="min-w-0">
                <strong className="block text-sm leading-5">{venue.name}</strong>
                <span className="mt-0.5 block text-xs leading-5 text-[#6c5c66]">{venue.sameArea ? "同じエリア" : "近い規模"} · 座席写真{counts[venue.id] ?? 0}枚</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" className="shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
