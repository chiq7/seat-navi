// Offline preparation only. This does not enable a campaign or write to a database.
export type EventRecord = { id: string; date: string; venue: string; title: string };
export type CampaignRegistration = { eventId: string; title: string; date: string; venue: string; venueId: string; session: string; sourceUrl: string; ticketSourceUrl: string; opensAt: string; closesAt: string };
export function prepareCampaignRegistration(value: CampaignRegistration, existing: EventRecord) {
  if (!value || !existing || value.eventId!==existing.id || value.date!==existing.date || value.venue!==existing.venue || value.title!==existing.title) throw new Error("既存公演のID・正式名・日付・会場との一致が必要です。");
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(value.eventId) || !/^[a-z0-9-]{1,64}$/.test(value.venueId) || !value.session?.trim() || value.session.length>80) throw new Error("公演ID・会場ID・開演回を確認してください。");
  for (const address of [value.sourceUrl,value.ticketSourceUrl]) { let url;try{url=new URL(address);}catch{throw new Error("公式日程と発券時期の根拠URLが必要です。");}if(url.protocol!=="https:" || url.username || url.password)throw new Error("根拠URLを確認してください。"); }
  const zoned=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;
  if(!zoned.test(value.opensAt) || !zoned.test(value.closesAt) || !Number.isFinite(Date.parse(value.opensAt)) || !Number.isFinite(Date.parse(value.closesAt)) || Date.parse(value.closesAt)<=Date.parse(value.opensAt))throw new Error("受付開始・終了は時差を含む日時で指定してください。");
  return { event_id:value.eventId,title:value.title,event_date:value.date,venue:value.venue,venue_id:value.venueId,session_label:value.session.trim(),source_url:value.sourceUrl,ticket_source_url:value.ticketSourceUrl,opens_at:value.opensAt,closes_at:value.closesAt,enabled:false as const };
}
