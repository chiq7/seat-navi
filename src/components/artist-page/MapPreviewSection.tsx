"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  venues: string[];
  topPredictionImageUrl?: string | null;
};

export default function MapPreviewSection({ venues, topPredictionImageUrl = null }: Props) {
  const displayVenues = venues.slice(0, 4);
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <section className="mt-4 px-4">
      <h2 className="mb-2 text-[22px] font-bold leading-none text-gray-900">マップ</h2>
      {displayVenues.length > 0 && (
        <div className="mb-2.5 grid grid-cols-4 gap-2">
          {displayVenues.map((venue, index) => (
            <button
              key={venue}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`h-8 truncate rounded-full border text-[11px] font-bold ${
                index === selectedIndex
                  ? "border-[#FF6B9D] bg-[#FF6B9D] text-white"
                  : "border-gray-200 bg-white text-gray-900"
              }`}
            >
              {venue}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <MapCard title="全報告の埋まり具合" />
        <MapCard title="いいね1位のファン予想図" imageUrl={topPredictionImageUrl} />
      </div>
      <div className="mt-2 flex justify-center gap-2">
        <span className="h-3 w-3 rounded-full bg-[#FF6B9D]" />
        <span className="h-3 w-3 rounded-full bg-gray-200" />
      </div>
      <button
        type="button"
        className="mx-auto mt-3 flex h-12 w-[76%] items-center justify-center rounded-full bg-[#FF6B9D] text-[17px] font-bold text-white shadow-sm"
      >
        詳しく見る・予想を投稿する
      </button>
    </section>
  );
}

function MapCard({ title, imageUrl }: { title: string; imageUrl?: string | null }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-2 py-2 shadow-sm">
      <h3 className="mb-1 text-center text-[13px] font-bold leading-none text-gray-900">{title}</h3>
      {imageUrl ? (
        <div className="relative mx-auto h-[68px] max-w-[160px] overflow-hidden rounded-lg">
          <Image src={imageUrl} alt="ファン予想図" fill className="object-cover" />
        </div>
      ) : (
        <StadiumMap />
      )}
    </div>
  );
}

function StadiumMap() {
  const blocks = Array.from({ length: 42 });
  return (
    <div className="relative mx-auto h-[68px] max-w-[160px] overflow-hidden rounded-[50%] border border-gray-100 bg-gray-50">
      <div className="absolute inset-x-1 top-2 h-[52px] rounded-[50%] border-[10px] border-gray-300" />
      <div className="absolute inset-x-5 top-[16px] h-9 rounded-[50%] border-[6px] border-gray-400" />
      <div className="absolute left-1/2 top-[18px] h-8 w-[64px] -translate-x-1/2 bg-white shadow-sm">
        <div className="flex h-full items-center justify-center text-[9px] font-bold text-gray-700">STAGE</div>
      </div>
      <div className="absolute inset-x-6 top-1 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-[1px]">
        {blocks.map((_, index) => (
          <span
            key={index}
            className={`h-[7px] rounded-[1px] ${index % 5 === 0 ? "bg-gray-400" : index % 3 === 0 ? "bg-gray-300" : "bg-gray-200"}`}
          />
        ))}
      </div>
    </div>
  );
}
