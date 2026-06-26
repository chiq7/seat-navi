export type FeedItem = {
  id: string;
  type: "当選" | "座席情報" | "落選";
  text: string;
  time: string;
  likes: number;
};

const tagStyles: Record<FeedItem["type"], { bg: string; color: string }> = {
  当選: { bg: "#FDF0F4", color: "#FF6B9D" },
  座席情報: { bg: "#EFF6FF", color: "#3B82F6" },
  落選: { bg: "#F3F4F6", color: "#6B7280" },
};

export default function RealtimeFeedItem({ item }: { item: FeedItem }) {
  const tag = tagStyles[item.type];
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      <span
        className="shrink-0 text-[10px] font-bold rounded-full py-0.5"
        style={{ backgroundColor: tag.bg, color: tag.color, width: "56px", textAlign: "center", display: "inline-block" }}
      >
        {item.type}
      </span>
      <p className="flex-1 text-[12px] text-gray-700 truncate min-w-0 leading-none">
        {item.text}
      </p>
      <span className="shrink-0 text-[10px] text-gray-400 whitespace-nowrap">
        {item.time}
      </span>
      <div className="shrink-0 flex items-center gap-0.5">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="#FF6B9D"
        >
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span
          className="text-[10px] font-semibold"
          style={{ color: "#FF6B9D" }}
        >
          {item.likes}
        </span>
      </div>
    </div>
  );
}
