"use client";

import Link from "next/link";
import type { Event } from "@/lib/types";
import { starRating, atsumariLabel, genreLabel } from "@/lib/utils";

const GENRE_COLORS: Record<string, string> = {
  kpop: "bg-purple-100 text-purple-700",
  johnnys: "bg-blue-100 text-blue-700",
  female_idol: "bg-pink-100 text-pink-700",
  male_idol: "bg-cyan-100 text-cyan-700",
  other: "bg-gray-100 text-gray-600",
};

const GENRE_ICONS: Record<string, string> = {
  kpop: "💜",
  johnnys: "💙",
  female_idol: "🩷",
  male_idol: "🩵",
  other: "🎵",
};

type EventCardProps = {
  event: Event;
  rank?: number;
  compact?: boolean;
};

export function EventCard({ event, rank, compact = false }: EventCardProps) {
  const genreColor = GENRE_COLORS[event.genre] ?? GENRE_COLORS.other;
  const genreIcon = GENRE_ICONS[event.genre] ?? "🎵";

  if (compact) {
    return (
      <Link href={`/venue/${event.id}`} className="block snap-start shrink-0">
        <div className="card-hover w-[140px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex h-[80px] items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
            <span className="text-3xl">{genreIcon}</span>
          </div>
          <div className="p-2.5">
            <div className="truncate text-xs font-semibold text-gray-900">
              {event.artist_name}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-gray-500">
              {event.venue_name}
            </div>
            <div className="mt-1 text-[10px] text-amber-500">
              {starRating(event.atsumari_score)}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/venue/${event.id}`} className="block">
      <div className="card-hover flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm">
        {rank != null && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] text-sm font-bold text-white">
            {rank}
          </div>
        )}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 text-xl">
          {genreIcon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-gray-900">
            {event.event_name}
          </div>
          <div className="mt-0.5 truncate text-[10px] text-gray-500">
            {event.venue_name}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-amber-500">
              {starRating(event.atsumari_score)}
            </span>
            <span className="text-[10px] text-gray-400">
              {atsumariLabel(event.atsumari_score)}
            </span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${genreColor}`}
        >
          {genreLabel(event.genre)}
        </span>
      </div>
    </Link>
  );
}
