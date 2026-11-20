"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { SEAT_PHOTO_MAP_COLOR, SeatPhotoMarker, SeatViewDialog, type SeatViewMatch } from "@/components/venue/template/SeatViewPosts";
import type { EventArenaPhotoLayout } from "@/lib/eventArenaPhotos";

type Points = EventArenaPhotoLayout["blocks"][number]["points"];

function interiorPoint(points: Points) {
  const ys = points.map(point => point[1]);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const y = (top + bottom) / 2;
  const crossings = points.flatMap(([startX, startY], index) => {
    const [endX, endY] = points[(index + 1) % points.length];
    if ((startY > y) === (endY > y)) return [];
    return [startX + (endX - startX) * (y - startY) / (endY - startY)];
  }).sort((a, b) => a - b);
  let left = points[0][0];
  let right = left;
  for (let index = 0; index + 1 < crossings.length; index += 2) {
    if (crossings[index + 1] - crossings[index] > right - left) {
      left = crossings[index];
      right = crossings[index + 1];
    }
  }
  return { x: (left + right) / 2, y, width: right - left, height: bottom - top };
}

export function EventArenaPhotoMap({
  layout, eventTitle, sectionId = "arena-seat-photos", mapTitle: customTitle,
}: {
  layout: EventArenaPhotoLayout;
  eventTitle: string;
  sectionId?: string;
  mapTitle?: string;
}) {
  const dialogId = useId();
  const svg = useRef<SVGSVGElement>(null);
  const [displayWidth, setDisplayWidth] = useState(360);
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const unitPerPixel = layout.viewBox[2] / displayWidth;
  const dateLabel = new Date(layout.date).toLocaleDateString("ja-JP", {
    dateStyle: "long", timeZone: "Asia/Tokyo",
  });

  useEffect(() => {
    const node = svg.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setDisplayWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const blocksWithPhotos = new Set(layout.photos.map(photo => photo.block));
  const blocks = layout.blocks.map(block => ({
    ...block, center: interiorPoint(block.points), hasPhoto: blocksWithPhotos.has(block.id),
  }));
  const matches = layout.photos.filter(photo => photo.block === openBlock).map<SeatViewMatch>(photo => ({
    label: "同じブロックの参考",
    context: sectionId === "arena-seat-photos" ? "この公演の同じブロック" : "過去公演の同じブロックの参考写真",
    post: {
      url: photo.url,
      photo: photo.photo,
      source: photo.source,
      row: photo.row,
      seat: photo.seat,
      seatVerified: photo.seatVerified,
      place: { kind: "section", id: photo.block },
      area: photo.positionLabel ? `${photo.block}ブロック（${photo.positionLabel}）` : `${photo.block}ブロック`,
      event: `${dateLabel}・${eventTitle}`,
    },
  }));
  const stage = layout.stage ? interiorPoint(layout.stage) : null;
  const isReference = blocks.every(block => block.approximate);
  const mapTitle = customTitle ?? (isReference ? "アリーナの撮影位置の目安" : "公演のアリーナ座席図");

  return <section id={sectionId} className="zr-container scroll-mt-[120px] py-6 sm:py-8" aria-labelledby={`${dialogId}-heading`}>
    <h2 id={`${dialogId}-heading`} className="artist-heading">{mapTitle}</h2>
    <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-[#68525e]">
      <time dateTime={layout.date} className="font-bold tabular-nums">{dateLabel}</time>
      <span className="min-w-0 break-words">{eventTitle}</span>
    </p>
    <p id={`${dialogId}-guide`} className="mb-2 mt-3 flex flex-wrap items-center gap-1.5 rounded-lg bg-[#f6edf4] px-3 py-2.5 text-[13px] font-bold text-[#653457]">
      <Camera size={16} className="shrink-0" aria-hidden="true" /><span>写真あり・{layout.photos.length}枚</span><span className="text-xs font-medium">カメラ印をタップ</span>
    </p>
    <svg ref={svg} viewBox={layout.viewBox.join(" ")} role="group" aria-label={mapTitle}
      aria-describedby={`${dialogId}-guide`}
      className="block h-auto w-full overflow-hidden rounded-xl border border-[#eadfe4] bg-white">
      {stage && layout.stage && <g aria-hidden="true">
        <polygon points={layout.stage.map(point => point.join(",")).join(" ")} fill="#783b59" />
        <text x={stage.x} y={stage.y} dominantBaseline="central" textAnchor="middle"
          fontSize={Math.min(12 * unitPerPixel, stage.width / 5)} fontWeight={700} fill="#fff">ステージ</text>
      </g>}
      {layout.subStage && <polygon points={layout.subStage.map(point => point.join(",")).join(" ")}
        fill="#783b59" aria-hidden="true" />}
      {blocks.map(block => {
        const { center, hasPhoto } = block;
        const points = block.points.map(point => point.join(",")).join(" ");
        const width = center.width / unitPerPixel;
        const height = center.height / unitPerPixel;
        const labelSize = Math.min(11, width / Math.max(1.5, block.id.length * .8), height * (hasPhoto ? .38 : .8)) * unitPerPixel;
        const icon = Math.min(16, width * .8, height * .46) * unitPerPixel;
        const clipId = `${dialogId}-block-${block.id}`;
        return <g key={block.id} role={hasPhoto ? "button" : undefined} tabIndex={hasPhoto ? 0 : undefined}
          aria-label={hasPhoto ? `${block.id}ブロックの写真を見る` : undefined} aria-haspopup={hasPhoto ? "dialog" : undefined}
          data-event-arena-photo-marker={hasPhoto ? block.id : undefined} className={hasPhoto ? "zr-focus cursor-pointer" : undefined}
          onClick={hasPhoto ? () => setOpenBlock(block.id) : undefined}
          onKeyDown={hasPhoto ? event => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpenBlock(block.id); }
          } : undefined}>
          <polygon points={points} fill={hasPhoto ? "#ead8e7" : "#f4eef2"}
            stroke={hasPhoto ? SEAT_PHOTO_MAP_COLOR : "#c9bcc4"} strokeWidth={hasPhoto ? 1.6 : 1}
            strokeDasharray={block.approximate ? "3 2" : undefined} vectorEffect="non-scaling-stroke"
            pointerEvents="fill" data-arena-block={block.id}
            data-event-arena-photo-area={hasPhoto ? block.id : undefined} data-event-arena-camera={hasPhoto ? block.id : undefined}
            data-placement={hasPhoto ? "inside-block" : undefined} />
          <clipPath id={clipId}><polygon points={points} /></clipPath>
          <g clipPath={`url(#${clipId})`} pointerEvents="none" aria-hidden="true">
            {hasPhoto && <SeatPhotoMarker x={center.x} y={center.y - labelSize * .58} size={icon} highlighted />}
            <text x={center.x} y={hasPhoto ? center.y + icon * .54 : center.y} dominantBaseline="central" textAnchor="middle"
              fontSize={labelSize} fontWeight={700} fill="#57434e">{block.id}</text>
          </g>
        </g>;
      })}
    </svg>
    {blocks.some(block => block.hasPhoto && Math.min(block.center.width, block.center.height) / unitPerPixel < 44) &&
      <div aria-label="ブロックから写真を開く" className="mt-2 flex flex-wrap gap-2">
        {blocks.filter(block => block.hasPhoto && Math.min(block.center.width, block.center.height) / unitPerPixel < 44).map(block =>
          <button type="button" key={block.id} aria-haspopup="dialog" onClick={() => setOpenBlock(block.id)}
            className="zr-focus inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-[#d6c2d0] px-3 text-sm font-bold text-[#653457]">
            <Camera size={16} aria-hidden="true" />{block.id}の写真
          </button>)}
      </div>}
    <a href={layout.layoutSource} target="_blank" rel="noopener noreferrer"
      className="zr-focus mt-1 inline-flex min-h-11 items-center text-xs font-bold text-[#90254f]">配置図の出典 ↗</a>
    {matches.length > 0 && <SeatViewDialog key={openBlock} matches={matches} panelId={dialogId} compact onClose={() => setOpenBlock(null)} />}
  </section>;
}
