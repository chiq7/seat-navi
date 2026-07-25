"use client";

import { useState } from "react";
import SeatReportTimelineSection from "@/components/artist-page/SeatReportTimelineSection";
import { ReportTimelineList } from "@/components/artist-page/ReportSection";
import { SeatPredictionCard } from "@/components/common/SeatPredictionCard";
import { MyPostActions, type PostMutationResult } from "@/components/mypage/MyPostActions";
import type { AfterReportCard, TicketResultAnalytics } from "@/lib/artistPageTypes";
import type { PostAuthor } from "@/lib/postAuthors";
import type { CrawledEvent, FanSeatPrediction } from "@/lib/types";

export type OwnedSeatPrediction = FanSeatPrediction & {
  imageUrl: string;
  voteCount: number;
};

type Props = {
  ticketPosts: TicketResultAnalytics[];
  predictions: OwnedSeatPrediction[];
  livePosts: AfterReportCard[];
  eventMap: Map<string, CrawledEvent>;
  authorMap: Map<string, PostAuthor>;
  onUpdateTicket: (id: string, value: string) => Promise<PostMutationResult>;
  onDeleteTicket: (id: string) => Promise<PostMutationResult>;
  onUpdatePrediction: (id: string, value: string) => Promise<PostMutationResult>;
  onDeletePrediction: (prediction: OwnedSeatPrediction) => Promise<PostMutationResult>;
  onUpdateLive: (id: string, value: string) => Promise<PostMutationResult>;
  onDeleteLive: (id: string) => Promise<PostMutationResult>;
};

type Tab = "ticket" | "prediction" | "live";

export function MyPostsSection({
  ticketPosts,
  predictions,
  livePosts,
  eventMap,
  authorMap,
  onUpdateTicket,
  onDeleteTicket,
  onUpdatePrediction,
  onDeletePrediction,
  onUpdateLive,
  onDeleteLive,
}: Props) {
  const [tab, setTab] = useState<Tab>("ticket");
  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "ticket", label: "当落", count: ticketPosts.length },
    { id: "prediction", label: "座席予想", count: predictions.length },
    { id: "live", label: "現地レポ", count: livePosts.length },
  ];

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-[10px] font-bold text-[#FF6B9D]">MY POSTS</p>
          <h2 className="text-[17px] font-extrabold text-gray-900">自分の投稿</h2>
        </div>
        <p className="text-[10px] text-gray-400">種類ごとに確認できます</p>
      </div>

      <div className="mt-3 grid grid-cols-3 rounded-xl bg-gray-100 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg py-2 text-[10px] font-bold transition-colors ${
              tab === item.id ? "bg-white text-[#FF6B9D] shadow-sm" : "text-gray-500"
            }`}
          >
            {item.label}<span className="ml-1 text-[9px]">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === "ticket" && (
          <SeatReportTimelineSection
            items={ticketPosts}
            eventMap={eventMap}
            title={null}
            emptyText="当落レポはまだありません"
            authorMap={authorMap}
            actions={(item) => (
              <MyPostActions
                value={item.comment ?? ""}
                label="コメント"
                onSave={(value) => onUpdateTicket(item.id, value)}
                onDelete={() => onDeleteTicket(item.id)}
              />
            )}
          />
        )}

        {tab === "prediction" && (
          predictions.length > 0 ? (
            <div className="space-y-3">
              {predictions.map((prediction) => {
                const event = eventMap.get(prediction.event_id);
                return (
                  <div key={prediction.id}>
                  <SeatPredictionCard
                    eventId={prediction.event_id}
                    predictionId={prediction.id}
                    imageUrl={prediction.imageUrl}
                    comment={prediction.comment}
                    tags={prediction.prediction_tags}
                    venue={event?.venue}
                    dateLabel={event?.date ?? "日付不明"}
                    createdAt={prediction.created_at}
                    likeCount={prediction.voteCount}
                    author={prediction.user_id ? authorMap.get(prediction.user_id) : null}
                  />
                  <div className="px-2">
                    <MyPostActions
                      value={prediction.comment ?? ""}
                      label="コメント"
                      onSave={(value) => onUpdatePrediction(prediction.id, value)}
                      onDelete={() => onDeletePrediction(prediction)}
                    />
                  </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-[#FFF8FB] px-4 py-6 text-center text-[12px] text-gray-500">座席予想の投稿はまだありません</div>
          )
        )}

        {tab === "live" && (
          <ReportTimelineList
            reports={livePosts}
            emptyText="現地レポはまだありません"
            authorMap={authorMap}
            actions={(report) => (
              <MyPostActions
                value={report.memo ?? ""}
                label="メモ"
                onSave={(value) => onUpdateLive(report.id, value)}
                onDelete={() => onDeleteLive(report.id)}
              />
            )}
          />
        )}
      </div>
    </section>
  );
}
