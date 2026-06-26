import { Flame } from "lucide-react";
import SectionHeader from "./SectionHeader";
import HotReportCard, { type HotReport } from "./HotReportCard";

const CARD_IMAGES = [
  "/images/cards/card-red.png",
  "/images/cards/card-blue.png",
  "/images/cards/card-green.png",
  "/images/cards/card-purple.png",
  "/images/cards/card-yellow.png",
];

const hotReports: HotReport[] = [
  {
    id: "1",
    artist: "NiziU",
    title: "Live with U 2026 THE CINEMA",
    count: "12,845",
    imageUrl: CARD_IMAGES[0],
  },
  {
    id: "2",
    artist: "SEVENTEEN",
    title: "FOLLOW AGAIN TO JAPAN",
    count: "9,532",
    imageUrl: CARD_IMAGES[1],
  },
  {
    id: "3",
    artist: "Stray Kids",
    title: "dominATE JAPAN",
    count: "6,210",
    imageUrl: CARD_IMAGES[2],
  },
];

export default function HotReportsSection() {
  return (
    <section className="mt-4">
      <SectionHeader
        icon={<Flame size={16} color="#FF6B9D" />}
        title="報告急増中の公演"
      />
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {hotReports.map((item, index) => (
          <HotReportCard
            key={item.id}
            item={{
              ...item,
              imageUrl: CARD_IMAGES[index % CARD_IMAGES.length],
            }}
          />
        ))}
        {/* Trailing spacer so last card doesn't clip */}
        <div className="shrink-0 w-1" />
      </div>
    </section>
  );
}
