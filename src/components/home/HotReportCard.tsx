import Link from "next/link";

export type HotReport = {
  id: string;
  artist: string;
  title: string;
  count: string;
  imageUrl: string;
};

export default function HotReportCard({ item }: { item: HotReport }) {
  return (
    <div className="shrink-0 w-[160px] rounded-[16px] overflow-hidden bg-white shadow-sm">
      {/* Image area */}
      <div className="relative h-[115px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.artist}
          className="w-full h-full object-cover"
          style={{ objectPosition: "center 100%" }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 60%, rgba(255,255,255,1) 100%)",
          }}
        />

        {/* Heart button */}
        <button
          type="button"
          className="absolute top-[4px] right-[4px] w-[28px] h-[28px] rounded-full bg-white flex items-center justify-center border-none cursor-pointer"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FF6B9D" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Artist name */}
        <p
          className="absolute left-0 right-0 text-center text-white text-[16px] font-bold m-0"
          style={{ bottom: "72px", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
        >
          {item.artist}
        </p>

        {/* Live title */}
        <p
          className="absolute left-0 right-0 text-center text-white text-[10px] font-normal overflow-hidden text-ellipsis whitespace-nowrap m-0"
          style={{ bottom: "50px", padding: "0 8px", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
        >
          {item.title}
        </p>

        {/* 報告数 label */}
        <p
          className="absolute left-0 right-0 text-center text-[9px]"
          style={{ bottom: 0, color: "#111", marginTop: 0, marginRight: 0, marginBottom: "2px", marginLeft: 0 }}
        >
          報告数
        </p>
      </div>

      {/* Bottom area — count + button */}
      <div className="flex flex-col" style={{ padding: "2px 10px 10px" }}>
        <div className="text-center">
          <span className="text-[24px] font-bold leading-none" style={{ color: "#FF6B9D" }}>
            {item.count}
          </span>
          <span className="text-[11px]" style={{ color: "#111" }}>件</span>
        </div>
        <Link
          href="/report"
          className="block w-full text-center text-white rounded-[20px] text-[11px] font-bold"
          style={{ marginTop: "2px", marginBottom: 0, backgroundColor: "#FF6B9D", padding: "6px 0" }}
        >
          報告する
        </Link>
      </div>
    </div>
  );
}
