"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { campaignChanges, numberLabel, parseSeatInput, SEAT_KINDS, UNREPORTED_NOTE, type CampaignBaseline, type CampaignEvent, type CampaignSummary, type SeatKind } from "@/lib/seat-campaign/model";
import { CampaignImage } from "./CampaignImage";
import { CampaignPredictionLayer } from "./CampaignPredictionLayer";
import { campaignImageRows } from "@/lib/seat-campaign/imageRows";
import { downloadPngBlob, renderMapImageAsPngBlob } from "@/lib/arena-map/exportMapImage";
import styles from "./SeatCampaign.module.css";
import { readSearchDraft, searchDraftPrefill, SEARCH_DRAFT_KEY, type SearchDraft } from "@/lib/seat-campaign/searchHandoff";
import MyContributions from "./MyContributions";
import { receiptLedger, storeReceipt, removeReceipt, RECEIPTS_CHANGED, type ManagedReceipt } from "@/lib/seat-campaign/receiptLedger";
import { queryAcquisition } from "@/lib/seat-campaign/attribution";
import { campaignClientError } from "@/lib/seat-campaign/clientError";
import { CAMPAIGN_REFRESH_MS, canRefreshCampaign, SEAT_ONLY_PRESENTATION } from "@/lib/seat-campaign/presentation";

import { trackEvent } from "@/lib/analytics";
import { campaignLinks, campaignMetric, xCampaignDrafts, xShareIntent, type CampaignMetric, type Receipt } from "@/lib/seat-campaign/clientFlow";
type State = { event: CampaignEvent; summary: CampaignSummary; baseline: CampaignBaseline | null; localOnly: boolean };
type Pending = Receipt;
async function request<T>(endpoint: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(endpoint, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal } : { cache: "no-store", signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "通信を完了できませんでした。");
  return result;
}
const draftCache = new Map<string,{ raw: string | null; draft: SearchDraft | null }>();
function searchDraftSnapshot(event: CampaignEvent) {
  if (new URLSearchParams(window.location.search).get("from") !== "seat-search") return null;
  try {
    const raw=sessionStorage.getItem(SEARCH_DRAFT_KEY), key=JSON.stringify([event.id,event.date,event.session,event.venueId]);
    const cached=draftCache.get(key);
    if(cached?.raw===raw)return cached.draft;
    const draft=readSearchDraft(raw,event,event.venueId??"",Date.now());
    draftCache.set(key,{raw,draft});return draft;
  }catch{return null;}
}
const subscribeDraft = (callback: () => void) => { window.addEventListener("storage", callback); return () => window.removeEventListener("storage", callback); };
const serverDraftSnapshot = () => null;
export default function SeatCampaign(props: { initial: State; initialView?: "report" | "summary" }) {
  const snapshot=useCallback(()=>searchDraftSnapshot(props.initial.event),[props.initial.event]);
  const draft = useSyncExternalStore(subscribeDraft, snapshot, serverDraftSnapshot);
  const e=props.initial.event;
  const matchingDraft=draft?.eventId===e.id && draft.date===e.date && draft.session===e.session ? draft : null;
  return <CampaignForm key={matchingDraft?.id ?? e.id} {...props} searchDraft={matchingDraft} />;
}
function CampaignForm({ initial, initialView = "report", searchDraft }: { initial: State; initialView?: "report" | "summary"; searchDraft: SearchDraft | null }) {
  const prefill = searchDraft ? searchDraftPrefill(searchDraft) : null;
  const [state, setState] = useState(initial), [view, setView] = useState(initialView);
  const [seatType, setSeatType] = useState<SeatKind | "">(prefill?.seatType ?? ""), [block, setBlock] = useState(""), [row, setRow] = useState(prefill?.row ?? ""), [number, setNumber] = useState(prefill?.number ?? "");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [readError, setReadError] = useState("");
  const [saved, setSaved] = useState(false), [locked, setLocked] = useState(false), [notice, setNotice] = useState("");
  const [page, setPage] = useState(0), [exporting, setExporting] = useState(false), [rowLimit,setRowLimit]=useState(100);
  const pending = useRef<Pending | null>(null), submitting = useRef(false), readSequence = useRef(0), svgRef = useRef<SVGSVGElement>(null);
  const readRequest = useRef<AbortController | null>(null);
  const e = state.event, s = state.summary;
  const endpoint = state.localOnly ? "/api/dev/seat-campaign" : "/api/seat-campaign?eventId=" + encodeURIComponent(e.id);
  const [comparison, setComparison] = useState<CampaignBaseline | null>(initial.baseline);
  const started = useRef(false), arrived = useRef(false);
  const metric = useCallback((name: CampaignMetric) => { if (initial.localOnly) return; const m=campaignMetric(name,initial.event.id,window.location.search,initialView); trackEvent(m.name,m.params); },[initial.localOnly,initial.event.id,initialView]);
  useEffect(() => { if(!arrived.current){arrived.current=true;metric("arrival");} },[metric]);
  const notifyReceipts=()=>window.dispatchEvent(new Event(RECEIPTS_CHANGED));
  const recoverReceipts=()=>receiptLedger(localStorage,e);
  function startInput() { if(!started.current){started.current=true;metric("start");} }
  async function withdraw(owned:ManagedReceipt, edit=false) {
    if(submitting.current)return;
    submitting.current=true;setBusy(true);setError("");
    try {
      await request(endpoint,{action:"withdraw",eventId:e.id,id:owned.id,token:owned.token},AbortSignal.timeout(20_000));
      removeReceipt(localStorage,e,owned.id);notifyReceipts();
      if(pending.current?.id===owned.id){pending.current=null;setLocked(false);setSaved(false);}
      if(edit){pending.current=null;setSaved(false);setLocked(false);setSeatType(owned.input.seatType);setBlock(owned.input.block);setRow(owned.input.row);setNumber(owned.input.number);}
      setNotice(edit?"撤回しました。内容を修正して、もう一度報告してください。":"この投稿を集計から撤回しました。");metric("withdraw");await reload();
    }catch(err){setError(campaignClientError(err,"撤回を確認できません。同じ操作で再試行できます。"));}finally{submitting.current=false;setBusy(false);}
  }
  function retryReceipt(r:ManagedReceipt){pending.current=r;setSeatType(r.input.seatType);setBlock(r.input.block);setRow(r.input.row);setNumber(r.input.number);setSaved(false);setLocked(true);setNotice("保存結果が不明な投稿を引き継ぎました。「同じ内容で保存を再試行」で確認できます。");}
  const links = campaignLinks(e.id, state.localOnly);
  // Local paths stay local; no fabricated production campaign URL is copied into a draft.
  const drafts = xCampaignDrafts(s, state.localOnly);
  const changes = campaignChanges(s, comparison);
  const imagePageCount = Math.max(1, Math.ceil(campaignImageRows(s.rows).length / 5));
  const reload = useCallback(async () => {
    readRequest.current?.abort();
    const controller = new AbortController(); readRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), 10_000);
    const sequence = ++readSequence.current;
    try {
      const next = await request<State>(endpoint, undefined, controller.signal);
      if (sequence === readSequence.current) { setState(next); setReadError(""); }
    } catch (err) { if (sequence === readSequence.current) setReadError(campaignClientError(err,"集計を読み取れませんでした。")); }
    finally { window.clearTimeout(timeout); if (readRequest.current === controller) readRequest.current = null; }
  }, [endpoint]);
  const cancelReads = useCallback(() => { readSequence.current += 1; readRequest.current?.abort(); readRequest.current = null; }, []);
  useEffect(() => {
    const refresh = () => {
      if (canRefreshCampaign(view, document.visibilityState === "visible", navigator.onLine, submitting.current, Boolean(readRequest.current))) void reload();
    };
    const timer = window.setInterval(refresh, CAMPAIGN_REFRESH_MS);
    document.addEventListener("visibilitychange", refresh); window.addEventListener("online", refresh);
    refresh();
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("online", refresh); cancelReads(); };
  }, [view, reload, cancelReads]);
  function changeView(next: "report" | "summary") {
    setView(next);
    // Keep the draft identity through view changes so a tab switch does not remount the form.
    const url=new URL(links[next === "report" ? "form" : "summary"],location.origin);
    const query=new URLSearchParams(location.search);
    for(const key of ["utm_source","utm_medium","utm_campaign","utm_content"]) {const value=query.get(key);if(value && /^[a-zA-Z0-9_-]{1,80}$/.test(value))url.searchParams.set(key,value);}
    if(searchDraft)url.searchParams.set("from","seat-search");
    history.replaceState(null, "", url.pathname+url.search);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current || saved) return;
    setError(""); setNotice("");
    try {
      if (!pending.current) {
        const input=parseSeatInput({eventId:e.id,date:e.date,session:e.session,seatType,block,row,number},e);
        const previous=recoverReceipts().find(r=>JSON.stringify(r.input)===JSON.stringify(input));
        if(previous && JSON.stringify(previous.input)===JSON.stringify(input)) pending.current=previous;
        else pending.current={id:crypto.randomUUID(),token:[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,"0")).join(""),input};
      }
      // Save the capability before sending, including uncertain-network retries.
      storeReceipt(localStorage,e,pending.current,"pending");notifyReceipts();
    } catch (err) { setError(err instanceof Error ? err.message : "入力を確認してください。"); return; }
    submitting.current = true; setBusy(true); setLocked(true);
    try {
      const clientKey="tixrepo:seat-campaign:participant:"+e.id;
      let clientToken=localStorage.getItem(clientKey);if(!clientToken || !/^[a-f0-9]{64}$/.test(clientToken)){clientToken=[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,"0")).join("");localStorage.setItem(clientKey,clientToken);}
      const result = await request<{ saved: { id: string; withdrawn: boolean; repeated: boolean } }>(endpoint, { action: "submit", eventId: e.id, ...pending.current,clientToken,acquisition:queryAcquisition(location.search) }, AbortSignal.timeout(20_000));
      if (result.saved.id !== pending.current.id) throw new Error("保存結果の公演・送信IDを確認できませんでした。");
      if(result.saved.withdrawn)throw new Error("この投稿は撤回済みです。撤回ボタンで状態を整理してから、新しく入力してください。");
      storeReceipt(localStorage,e,pending.current,"saved");notifyReceipts();setSaved(true);if(!result.saved.repeated)metric("save_success"); setNotice((state.localOnly?"ローカルに保存しました。":"保存しました。")+"「自分の報告を集計で見る」から確認できます。");
      await reload();
    } catch (err) { metric("save_error"); setError(campaignClientError(err,"保存結果を確認できません。同じ送信IDで再試行できます。")); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function baseline() {
    setNotice("");
    try { const value={eventId:e.id,date:e.date,session:e.session,keys:s.keys,savedAt:s.updatedAt}; sessionStorage.setItem(`seat-campaign:baseline:${e.id}`,JSON.stringify(value));setComparison(value);setNotice("このタブの比較基準を保存しました。Xには投稿していません。"); }
    catch (err) { setNotice(err instanceof Error ? err.message : "比較の基準を保存できませんでした。"); }
  }
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice("未公開の下書きをコピーしました。リンクと内容を確認してから使用してください。"); }
    catch { setNotice("コピーできませんでした。下書き欄から文字を選択してコピーしてください。"); }
  }
  async function exportImage() {
    if (!svgRef.current || exporting || readError) return;
    setExporting(true); setNotice("");
    try {
      const blob = await renderMapImageAsPngBlob(svgRef.current, { scale: 1 });
      downloadPngBlob(blob, `seat-campaign-${state.localOnly?"LOCAL-ONLY-":""}${e.date}-${page + 1}.png`);
      setNotice(state.localOnly?"未公開・サンプルの表示付きで画像を保存しました。Xには投稿していません。":"集計画像を保存しました。Xには投稿していません。");
    } catch { setNotice("画像を作成できませんでした。座席入力の保存状況は変わりません。"); }
    finally { setExporting(false); }
  }
  return <main className={styles.page}>
    {state.localOnly && <div className={styles.preview}>未公開の動作確認版 · 入力はサンプルとしてローカル保存</div>}
    <header className={styles.header}>
      <a href={state.localOnly ? "/dev/venue-prediction-flow" : "/"} className={styles.brand}>ちけレポ</a>
      <span className={styles.eyebrow}>この公演だけの座席報告</span>
      <h1>{e.title}</h1>
      <p className={styles.date}>{e.date} · {e.session}<br />{e.venue}</p>
      <p className={styles.intro}>あなたの座席を、みんなの手がかりに。<br />報告された列・番号を、そのまま集計して返します。</p>
      <a className={styles.source} href={e.sourceUrl} target="_blank" rel="noopener noreferrer">公式の公演日程を確認 ↗</a>
      {state.localOnly && <p className={styles.small}>発券・座席表示の開始時期は未確認です。現在は募集を開始していません。</p>}
    </header>
    <nav className={styles.tabs} aria-label="座席報告と集計">
      <button type="button" aria-pressed={view === "report"} onClick={() => changeView("report")}>座席を報告</button>
      <button type="button" aria-pressed={view === "summary"} onClick={() => changeView("summary")}>現在の集計</button>
    </nav>
    {view === "report" && <section className={styles.section} aria-labelledby="seat-form-title">
      <h2 id="seat-form-title">券面の座席情報を教えてください</h2>
      <p>ログイン・当落・FC歴の入力は不要です。</p>
      {searchDraft && !saved && <p className={styles.note}>検索した{searchDraft.row}列・{searchDraft.number}番を引き継ぎました。図の表示は「{searchDraft.contextLabel}」。ブロック／階はチケットの表記を確認して入力してください。下のボタンを押すまで送信しません。</p>}
      <form onSubmit={submit} onChange={startInput} className={styles.form}>
        <fieldset disabled={locked || busy || saved || e.accepting===false}>
          <legend>席種 <span>必須</span></legend>
          <div className={styles.kinds}>{Object.entries(SEAT_KINDS).map(([key, name]) => <label key={key} data-checked={seatType === key}><input type="radio" name="seat-type" value={key} checked={seatType === key} onChange={() => setSeatType(key as SeatKind)} required />{name}</label>)}</div>
          <label className={styles.field} htmlFor="campaign-block">ブロック／階 <span>必須</span><input id="campaign-block" autoComplete="off" maxLength={32} value={block} onChange={ev => setBlock(ev.target.value)} placeholder="券面どおりに入力" required /></label>
          <div className={styles.pair}>
            <label className={styles.field} htmlFor="campaign-row">列 <span>必須</span><input id="campaign-row" autoComplete="off" maxLength={8} value={row} onChange={ev => setRow(ev.target.value)} placeholder="数字・英字" required /></label>
            <label className={styles.field} htmlFor="campaign-number">番号 <span>必須</span><input id="campaign-number" autoComplete="off" maxLength={12} value={number} onChange={ev => setNumber(ev.target.value)} placeholder="数字・範囲" required /></label>
          </div>
          <p className={styles.small}>範囲で送る場合は「10-19」。10席すべての報告には数えません。</p>
        </fieldset>
        <p className={styles.privacy}>入力した列・番号は集計に表示されます。氏名・連絡先・券面画像は入力不要です。</p>
        {error && <p role="alert" className={styles.error}>{error}{locked ? " 入力内容を保持しています。同じ内容で再試行してください。" : ""}</p>}
        {readError && <p role="alert" className={styles.error}>{saved ? "保存は完了していますが、" : ""}最新の集計を読み取れませんでした。集計画面から再読込してください。</p>}
        {e.accepting===false && <p role="status">この公演は募集期間外です。保存済みの投稿は下の履歴から撤回できます。</p>}
        {saved ? <div className={styles.success} role="status"><strong>{state.localOnly ? "ローカル保存" : "保存"}が完了しました</strong><button type="button" className={styles.primary} onClick={() => changeView("summary")}>自分の報告を集計で見る →</button><button type="button" className={styles.secondary} onClick={() => { pending.current = null; setSaved(false); setLocked(false); setBlock(""); setRow(""); setNumber(""); setNotice(""); }}>別の座席を入力する</button></div> : <button className={styles.primary} disabled={busy || e.accepting===false} type="submit">{busy ? "保存中…" : locked ? "同じ内容で保存を再試行" : "座席を報告して、集計を見る"}</button>}
      </form>
      <MyContributions event={e} busy={busy} onWithdraw={(r,edit)=>void withdraw(r,edit)} onRetry={retryReceipt} />
    </section>}
    {view === "summary" && <section className={styles.section} aria-labelledby="campaign-summary-title">
      <div className={styles.headingRow}><h2 id="campaign-summary-title">現在の集計</h2><button type="button" className={styles.secondary} onClick={reload}>再読込</button></div>
      <p className={styles.small}>更新：{new Date(s.updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false })} JST · 内容は確認中<br />画面を開いている間は30秒ごとに集計・画像・下書きを更新します。</p>
      {readError && <p role="alert" className={styles.error}>{readError} 前回の表示を残しています。画像・下書きの出力は保留中です。</p>}
      <div className={styles.stats}><p>本人入力<strong>{s.selfSubmissions}<small>件</small></strong></p><p>座席情報<strong>{s.selfLocations}<small>組</small></strong></p></div>
      <p className={styles.small}>照合済みの座席情報：{s.acceptedLocations ?? 0}組。確認待ち：{s.selfLocations-(s.acceptedLocations ?? 0)}組。配置が確定した席数とは別です。</p>
      <p className={styles.small}>{state.localOnly ? "サンプル入力のみ。" : "本人入力・未照合を含みます。"}回答者数・実在確認済みの席数ではありません。同じ席の報告は1組にまとめます。</p>
      <p className={styles.seatOnly}><span aria-hidden="true" style={{ background: SEAT_ONLY_PRESENTATION.color }} />{SEAT_ONLY_PRESENTATION.label}<small>{SEAT_ONLY_PRESENTATION.description}</small></p>
      <p className={styles.note}>{UNREPORTED_NOTE} 1列と20列の報告があっても、間の列を確認済みにはしません。</p>
      {s.rows.length ? <ul className={styles.rows}>{s.rows.slice(0,rowLimit).map(r => <li key={r.key}><div><span className={styles.tag}>{SEAT_KINDS[r.seatType]}</span><strong>{r.block}</strong><span className={styles.rowLabel}>{r.row}列</span></div><p>{r.numbers.map(numberLabel).join("・")}</p><small>本人入力 · 座席情報のみ · 照合済み：{r.acceptedNumbers?.length?r.acceptedNumbers.map(numberLabel).join("・"):"なし"}／それ以外は確認待ち</small></li>)}</ul> : <div className={styles.empty}><strong>まだ座席報告はありません</strong><p>報告が届くと、この公演の列・番号を一覧にします。</p></div>}
      <button type="button" className={styles.primary} onClick={() => changeView("report")}>この公演の座席を報告する →</button>
      {s.rows.length>100 && <div><p role="status">全{s.rows.length}行のうち{Math.min(rowLimit,s.rows.length)}行を表示。集計件数は全件です。</p>{rowLimit<s.rows.length && <button type="button" className={styles.secondary} onClick={()=>setRowLimit(n=>n+100)}>次の100行も表示する</button>}</div>}
      <div className={styles.separate}><h3>外部の補助資料：{s.externalLocations}組</h3><p>公開投稿・リセールなどは、本人入力の件数に含めません。</p>{s.external.map(r => <p key={r.id}>{r.block} {r.row}列 {numberLabel(r.number)} <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">出典</a></p>)}</div>
      <div className={styles.separate}><h3>予想図への反映</h3><CampaignPredictionLayer summary={s} /></div>
      {!state.localOnly && <a className={styles.secondary} href={xShareIntent(s)} target="_blank" rel="noopener noreferrer" onClick={()=>metric("share_click")}>この公演の集計をXで紹介する ↗</a>}
      <details className={styles.operations}><summary>運営用：画像・4種類の投稿下書き</summary>
        <p className={styles.small}>{state.localOnly ? "画像・下書きは未公開の確認用です。入力・集計のリンクは公開後に差し込みます。" : "画像・下書きは現在の集計から作成しています。内容を確認してから投稿してください。"}</p>
        <div className={styles.image}><CampaignImage summary={s} page={page} svgRef={svgRef} localOnly={state.localOnly} /></div>
        <div className={styles.actions}><button type="button" className={styles.secondary} disabled={page <= 0} onClick={() => setPage(p => p - 1)}>前の画像</button><button type="button" className={styles.secondary} disabled={page + 1 >= imagePageCount} onClick={() => setPage(p => p + 1)}>次の画像</button><button type="button" className={styles.primary} disabled={exporting || Boolean(readError)} onClick={exportImage}>{exporting ? "画像を作成中…" : "PNG画像を保存"}</button></div>
        {drafts.map(draft => <div key={draft.kind} className={styles.draft}><h3>{draft.kind}</h3><p className={styles.small}>X文字数の保守的な計算：{draft.weight}/280</p><textarea readOnly aria-label={`${draft.kind}の下書き`} value={draft.text} rows={7} /><button type="button" className={styles.secondary} disabled={Boolean(readError) || draft.weight>280} onClick={() => copy(draft.text)}>下書きをコピー</button></div>)}
        <div className={styles.separate}><h3>前回との比較</h3><p>{changes ? `基準から追加 ${changes.added}組・除外 ${changes.removed}組。予想図の変更数ではありません。` : "比較の基準がまだありません。増減を推測で表示しません。"}</p><button type="button" className={styles.secondary} disabled={Boolean(readError)} onClick={baseline}>現在の集計を比較の基準として保存</button></div>
      </details>
    </section>}
    {state.localOnly && <a className={styles.secondary} href="/dev/seat-campaign/operations">運営の確認・更新準備へ</a>}
    <p className={styles.notice} role="status">{notice}</p>
    <footer className={styles.footer}>{state.localOnly ? "動作確認用の保存先は本番と分離しています。公開・X投稿・本番DBへの反映は行いません。" : "座席の報告は予想を考えるための参考情報です。配置・方向は確認できた根拠に基づいて別途更新します。"}</footer>
  </main>;
}
