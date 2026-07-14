"use client";

import { useState } from "react";

export function ReportThumb({ index, photoUrl }: { index: number; photoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false);
  const positions = ["30%", "45%", "70%", "52%"];

  if (photoUrl && !imgError) {
    return (
      <div className="h-[104px] w-[152px] overflow-hidden rounded-xl bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="現地レポ写真"
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="h-[104px] w-[152px] overflow-hidden rounded-xl bg-[#100716]">
      <div
        className="h-full w-full"
        style={{
          background:
            `radial-gradient(circle at ${positions[index % positions.length]} 22%, rgba(255,255,255,0.9) 0 3px, transparent 4px), ` +
            "linear-gradient(115deg, rgba(255,107,157,0.7), transparent 36%), " +
            "repeating-linear-gradient(90deg, rgba(255,107,157,0.95) 0 1px, transparent 1px 6px), " +
            "linear-gradient(180deg, #2b1230, #050306)",
        }}
      />
    </div>
  );
}
