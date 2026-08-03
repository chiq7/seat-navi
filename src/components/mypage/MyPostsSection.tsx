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
    <section className="border-b border-[#ded8dc] pb-10 sm:pb-14" aria-labelledby="my-posts-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="artist-kicker">My Posts</p>
          <h2 id="my-posts-title" className="artist-heading">自分の投稿</h2>
        </div>
        <p className="text-[9px] font-black text-[#958d93]">EDIT &amp; MANAGE</p>
      </div>

      <div className="mt-7 grid grid-cols-3 border border-[#1c171b] bg-white">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`zr-focus min-h-12 border-r border-[#1c171b] px-1 text-[10px] font-black transition-colors last:border-r-0 ${
              tab === item.id ? "bg-[#1c171b] text-white" : "text-[#625a61]"
            }`}
          >
            {item.label}<span className="ml-1 text-[9px]">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 border border-[#ded8dc] bg-white p-3 sm:p-5">
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
            <div className="border border-dashed border-[#d9cfd4] bg-[#fcfbfc] px-4 py-8 text-center text-[12px] font-bold text-[#817981]">座席予想の投稿はまだありません</div>
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
