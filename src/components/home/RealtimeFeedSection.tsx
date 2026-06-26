import { Zap } from "lucide-react";
import SectionHeader from "./SectionHeader";
import RealtimeFeedItem, { type FeedItem } from "./RealtimeFeedItem";

const feedItems: FeedItem[] = [
  {
    id: "1",
    type: "当選",
    text: "NiziU 東京ドーム Day1 当選しました！🎉",
    time: "1分前",
    likes: 18,
  },
  {
    id: "2",
    type: "座席情報",
    text: "アリーナ Aブロック 12列目 センターステージ近いかも！",
    time: "2分前",
    likes: 12,
  },
  {
    id: "3",
    type: "落選",
    text: "NiziU 東京ドーム Day2 落選…🥲",
    time: "3分前",
    likes: 15,
  },
  {
    id: "4",
    type: "当選",
    text: "SEVENTEEN 京セラドーム 当選！楽しみすぎる✨",
    time: "4分前",
    likes: 22,
  },
  {
    id: "5",
    type: "座席情報",
    text: "スタンド1階25列 通路側！見え方良さそう👀",
    time: "5分前",
    likes: 11,
  },
  {
    id: "6",
    type: "落選",
    text: "Stray Kids 福岡 PayPayドーム 落選でした…😭",
    time: "6分前",
    likes: 9,
  },
];

export default function RealtimeFeedSection() {
  return (
    <section className="mt-5">
      <SectionHeader
        icon={<Zap size={16} color="#FF6B9D" />}
        title="リアルタイム速報"
      />
      <div className="mx-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {feedItems.map((item, index) => (
          <div key={item.id}>
            {index > 0 && <div className="h-px bg-gray-50 mx-3" />}
            <RealtimeFeedItem item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
