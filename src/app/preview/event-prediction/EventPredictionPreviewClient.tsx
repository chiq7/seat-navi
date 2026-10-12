"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { EventArenaMap } from "@/components/arena-map/EventArenaMap";
import { addedFixture, externalFixture, fixtureEvents, fixtureReports, secondDayFixture } from "./fixture";

const NO_EXTERNAL: typeof externalFixture[] = [];
const ONLY_EXTERNAL = [externalFixture];

export function EventPredictionPreviewClient() {
  const [eventId, setEventId] = useState(fixtureEvents[0].id);
  const [sample, setSample] = useState("baseline");
  const [returnToSeat, setReturnToSeat] = useState(0);
  const [imageUrl, setImageUrl] = useState<string>();
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
  const reports = useMemo(() => sample === "empty" || sample === "external" ? []
    : sample === "added" ? [...fixtureReports, addedFixture]
    : sample === "days" ? [...fixtureReports, secondDayFixture]
    : sample === "unsupported" ? [...fixtureReports, { ...addedFixture, block: "Z99" }]
    : fixtureReports, [sample]);
  return <main className="mx-auto max-w-[860px] px-3 py-5 text-[#332b31] sm:px-6">
    <h1 className="text-lg font-bold">座席予想の更新検証</h1>
    <p className="mb-3 text-xs text-[#71636c]">試験用データ · DB書込みなし</p>
    <div className="mb-3 flex flex-wrap gap-2">
      <select aria-label="試験データ" value={sample} onChange={event => setSample(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded border px-2">
        <option value="baseline">3席・追加前</option>
        <option value="added">G8の報告を追加</option>
        <option value="days">9/20の報告も追加</option>
        <option value="empty">0件</option>
        <option value="external">外部情報のみ</option>
        <option value="unavailable">読取り失敗</option>
        <option value="limited">取得未完了</option>
        <option value="unsupported">未知ブロック</option>
      </select>
      <select aria-label="試験の公演日" value={eventId} onChange={event => setEventId(event.target.value)} className="min-h-11 rounded border px-2">
        {fixtureEvents.map(event => <option key={event.id} value={event.id}>{event.date.slice(5).replace("-", "/")}</option>)}
      </select>
      <button type="button" className="min-h-11 rounded border px-3 text-sm" onClick={() => { setEventId(fixtureEvents[0].id); setSample("baseline"); setReturnToSeat(value => value + 1); }}>投稿後の自席を模擬</button>
    </div>
    <p className="mb-2 text-xs font-bold">京セラ · {eventId === fixtureEvents[0].id ? "9/19" : "9/20"} · 試験用</p>
    <div className="border border-[#ded8dc]">
      <EventArenaMap key={`${eventId}:${returnToSeat}`} eventId={eventId} reports={reports}
        externalObservations={sample === "external" ? ONLY_EXTERNAL : NO_EXTERNAL}
        detailEvents={fixtureEvents} interactive unverifiedConditions showSaveButton onSavedImage={image => setImageUrl(URL.createObjectURL(image))}
        initialSeat={returnToSeat ? { block: "F6", row: 14, seat: 6 } : undefined}
        predictionReadState={sample === "unavailable" ? "unavailable" : "ready"} predictionLimited={sample === "limited"} />
    </div>
    {imageUrl && <section className="mt-3 border-t pt-3">
      <h2 className="mb-2 text-sm font-bold">最後に保存したPNG（試験用）</h2>
      <Image src={imageUrl} alt="保存画像の確認" width={1000} height={1000} unoptimized className="h-auto w-full" />
    </section>}
  </main>;
}
