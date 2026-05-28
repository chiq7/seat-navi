"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { FanSeatPrediction } from "@/lib/types";

const VOTER_KEY_STORAGE = "seat-navi-voter-key";

type VoteRow = {
  prediction_id: string;
  voter_key: string;
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function imageSrc(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from("fan-seat-predictions").getPublicUrl(path).data.publicUrl;
}

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

function getOrCreateVoterKey(): string {
  const existing = localStorage.getItem(VOTER_KEY_STORAGE);
  if (existing) return existing;
  const created = randomId();
  localStorage.setItem(VOTER_KEY_STORAGE, created);
  return created;
}

export function FanSeatPredictionsCarousel({
  predictions,
}: {
  predictions: FanSeatPrediction[];
}) {
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [voteError, setVoteError] = useState("");

  useEffect(() => {
    if (predictions.length === 0) return;

    const key = getOrCreateVoterKey();
    const predictionIds = predictions.map((prediction) => prediction.id);
    supabase
      .from("fan_seat_prediction_votes")
      .select("prediction_id, voter_key")
      .in("prediction_id", predictionIds)
      .then(({ data, error }) => {
        if (error || !data) return;

        const rows = data as VoteRow[];
        const nextCounts: Record<string, number> = {};
        const nextPicked = new Set<string>();
        for (const row of rows) {
          nextCounts[row.prediction_id] = (nextCounts[row.prediction_id] ?? 0) + 1;
          if (row.voter_key === key) nextPicked.add(row.prediction_id);
        }
        setVoteCounts(nextCounts);
        setPickedIds(nextPicked);
      });
  }, [predictions]);

  const sortedPredictions = useMemo(
    () =>
      [...predictions].sort((a, b) => {
        const voteDiff = (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0);
        if (voteDiff !== 0) return voteDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [predictions, voteCounts],
  );

  async function handlePick(predictionId: string) {
    if (pickedIds.has(predictionId)) return;

    setVoteError("");
    const voterKey = getOrCreateVoterKey();
    const { error } = await supabase.from("fan_seat_prediction_votes").insert({
      id: randomId(),
      prediction_id: predictionId,
      voter_key: voterKey,
    });

    if (error) {
      if (error.code === "23505") {
        setPickedIds((current) => new Set(current).add(predictionId));
        return;
      }
      setVoteError("選択を保存できませんでした。時間をおいて再度お試しください。");
      return;
    }

    setVoteCounts((current) => ({
      ...current,
      [predictionId]: (current[predictionId] ?? 0) + 1,
    }));
    setPickedIds((current) => new Set(current).add(predictionId));
  }

  return (
    <section className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <p className="text-xs font-bold text-gray-700">みんなの座席予想</p>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
          ファンが投稿した座席予想です。公式情報ではありません
        </p>
      </div>

      {predictions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center">
          <p className="text-xs font-bold text-gray-600">まだファン予想はありません</p>
          <button
            type="button"
            disabled
            className="mt-3 rounded-full bg-gray-200 px-4 py-2 text-[11px] font-bold text-gray-500"
          >
            あなたの予想を投稿する
          </button>
        </div>
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            <div className="flex snap-x snap-mandatory gap-3">
              {sortedPredictions.map((prediction) => {
                const pickCount = voteCounts[prediction.id] ?? 0;
                const picked = pickedIds.has(prediction.id);

                return (
                  <article
                    key={prediction.id}
                    className="w-[82vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                  >
                    <div className="bg-gray-50 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageSrc(prediction.image_path)}
                        alt="ファン投稿の座席予想"
                        className="aspect-[4/3] w-full rounded-xl bg-white object-cover"
                      />
                    </div>
                    <div className="space-y-3 p-3">
                      {prediction.prediction_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {prediction.prediction_tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div>
                        <p className="text-[11px] font-bold text-gray-700">
                          {prediction.display_name || "匿名"}
                        </p>
                        {prediction.comment && (
                          <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-gray-700">
                            {prediction.comment}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                        <span className="text-[10px] text-gray-400">{formatDate(prediction.created_at)}</span>
                        <button
                          type="button"
                          disabled={picked}
                          onClick={() => handlePick(prediction.id)}
                          className={`rounded-xl px-3 py-1.5 text-[10px] font-bold leading-tight ${
                            picked
                              ? "bg-purple-50 text-purple-700"
                              : "bg-gray-100 text-gray-600 active:scale-95"
                          } disabled:cursor-default`}
                        >
                          <span className="block">{picked ? "これっぽい済み" : "これっぽい"}</span>
                          <span className="block font-normal">{pickCount}人が選択</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          {voteError && <p className="mt-2 text-[10px] text-red-500">{voteError}</p>}
        </>
      )}
    </section>
  );
}
