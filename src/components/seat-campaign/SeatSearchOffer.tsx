"use client";

import { useEffect, useId, useState } from "react";
import type { CampaignEvent } from "@/lib/seat-campaign/model";
import { campaignLinks } from "@/lib/seat-campaign/clientFlow";
import { PILOT_EVENT } from "@/lib/seat-campaign/pilot";
import { makeSearchDraft, SEARCH_DRAFT_KEY } from "@/lib/seat-campaign/searchHandoff";
import styles from "./SeatCampaign.module.css";

export default function SeatSearchOffer({ row = "", number = "", contextLabel = "", venueId, localOnly = false }: { row?: string; number?: string; contextLabel?: string; venueId?: string; localOnly?: boolean }) {
  const [eventId, setEventId] = useState(""), [error, setError] = useState("");
  const [events,setEvents]=useState<CampaignEvent[]>(localOnly?[PILOT_EVENT]:[]), controlId=useId();
  const hasSeat=/^(?:[1-9]\d{0,3}|[A-Z]{1,3})$/.test(row) && /^[1-9]\d{0,4}$/.test(number);
  useEffect(()=>{if(localOnly)return;const id=venueId??location.pathname.match(/^\/(?:venues|dev\/venue-guides)\/([a-z0-9-]+)/)?.[1];if(!id)return;
    const controller=new AbortController();fetch(`/api/seat-campaign/campaigns?venue=${encodeURIComponent(id)}`,{signal:controller.signal,cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error();const data=await r.json();setEvents(data.events);setError("");}).catch(()=>{if(!controller.signal.aborted)setError("募集公演を読み取れませんでした。");});return()=>controller.abort();
  },[venueId,localOnly]);
  if(!events.length)return error?<p role="status">{error}</p>:null;
  function continueToReport() {
    const event=events.find(e=>e.id===eventId);if(!event)return;
    try {
      if(hasSeat){const draft = makeSearchDraft(event, event.venueId??venueId??"kyocera-dome", row, number, contextLabel, crypto.randomUUID(), Date.now(), null);sessionStorage.setItem(SEARCH_DRAFT_KEY, JSON.stringify(draft));}
      window.location.assign(campaignLinks(event.id,localOnly).form+(hasSeat?"&from=seat-search":"&utm_source=site"));
    } catch { setError("引き継げませんでした。座席情報は送信していません。入力画面から入力できます。"); }
  }
  return <aside className={styles.searchOffer} aria-label="座席情報の提供">
    <strong>{hasSeat?"この席、あなたのチケットの座席ですか？":"この会場の座席情報を集めています"}</strong>
    <p>{hasSeat?`${row}列・${number}番を引き継いで、同じ公演の座席集計に協力できます。検索しただけでは送信しません。`:"チケットの公演を選んで、券面の座席を教えてください。"}</p>
    <label htmlFor={controlId}>チケットの公演を選ぶ{localOnly?"（未公開の確認用）":""}</label>
    <select id={controlId} value={eventId} onChange={event => setEventId(event.target.value)}>
      <option value="">公演・日時を選択</option>{events.map(e=><option key={e.id} value={e.id}>{e.date} {e.session} · {e.title}</option>)}
    </select>
    <button type="button" className={styles.primary} disabled={!eventId} onClick={continueToReport}>この座席情報を提供する →</button>
    <p className={styles.small}>次の画面で内容を確認してから保存します。当落・FC歴は不要です。</p>
    {error && <p role="alert">{error}</p>}
  </aside>;
}
