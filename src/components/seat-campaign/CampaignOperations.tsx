"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import type { CampaignEvent } from "@/lib/seat-campaign/model";
import type { ReviewReport,ReviewDecision,UpdatePack } from "@/lib/seat-campaign/operations";
import { CampaignImage } from "./CampaignImage";
import { campaignImageRows } from "@/lib/seat-campaign/imageRows";
import { downloadPngBlob,renderMapImageAsPngBlob } from "@/lib/arena-map/exportMapImage";
import styles from "./SeatCampaign.module.css";
import { campaignClientError } from "@/lib/seat-campaign/clientError";
type Data={reports:ReviewReport[];updates:UpdatePack[];currentRevision:string;metrics:{source:string;postId:string;received:number;active:number;accepted:number;excluded:number;uniqueLocations:number}[]};
export default function CampaignOperations({event,localOnly}:{event:CampaignEvent;localOnly:boolean}) {
  const [token,setToken]=useState(""),[data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  const [selected,setSelected]=useState(""),[reason,setReason]=useState(""),[evidence,setEvidence]=useState(""),[decision,setDecision]=useState<ReviewDecision>("received");
  const [postUrl,setPostUrl]=useState(""),[filter,setFilter]=useState("received"),[page,setPage]=useState(0),[listPage,setListPage]=useState(0);
  const svg=useRef<SVGSVGElement>(null);
  const [pngFile,setPngFile]=useState<{url:string;name:string}|null>(null);
  useEffect(()=>()=>{if(pngFile)URL.revokeObjectURL(pngFile.url);},[pngFile]);
  const endpoint=(localOnly?"/api/dev/seat-campaign/operations":"/api/seat-campaign/operations")+"?eventId="+encodeURIComponent(event.id);
  const load=useCallback(async(body?:unknown)=>{
    setBusy(true);setError("");try{
      const r=await fetch(endpoint,{method:body?"POST":"GET",cache:"no-store",headers:{...(body?{"Content-Type":"application/json"}:{}),...(!localOnly?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20_000)});
      const result=await r.json();if(!r.ok)throw new Error(result.error??"操作を確認できませんでした。");setData(result);return true;
    }catch(e){setError(campaignClientError(e,"接続できませんでした。"));return false;}finally{setBusy(false);}
  },[endpoint,localOnly,token]);
  useEffect(()=>{if(localOnly)void load();},[localOnly,load]);
  const report=data?.reports.find(r=>r.id===selected),pack=data?.updates[0];
  const stale=Boolean(pack&&data?.currentRevision!==pack.revision);
  const filtered=data?.reports.filter(r=>filter==="all"||r.status===filter)??[];
  async function moderate(){if(!report)return;if(await load({action:"review",id:report.id,expectedVersion:report.version,decision,reason,evidenceUrl:evidence})){setSelected("");setReason("");setEvidence("");setDecision("received");setNotice("確認結果を記録し、集計と更新素材を準備しました。Xへの送信はしていません。");}}
  async function checkFresh(){const r=await fetch(endpoint,{cache:"no-store",headers:!localOnly?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(10_000)});if(!r.ok)throw new Error("最新の状態を確認できません。出力を保留しました。");const fresh=await r.json() as Data;if(fresh.currentRevision!==pack?.revision || fresh.updates[0]?.id!==pack?.id){setData(fresh);throw new Error("集計が変わりました。最新版を準備してから出力してください。");}}
  async function png(){if(!svg.current || stale)return;setBusy(true);try{await checkFresh();const blob=await renderMapImageAsPngBlob(svg.current,{scale:1}),name=`seat-update-${pack!.id.slice(0,12)}-${page+1}.png`;setPngFile({url:URL.createObjectURL(blob),name});downloadPngBlob(blob,name);setNotice("保存時点の集計画像を作成しました。保存が始まらない場合は下のPNGリンクを使ってください。");}catch(e){setError(e instanceof Error?e.message:"画像を保存できませんでした。");}finally{setBusy(false);}}
  async function copy(text:string){try{await checkFresh();await navigator.clipboard.writeText(text);setNotice("下書きをコピーしました。Xへの送信はしていません。");}catch(e){setError(e instanceof Error?e.message:"コピーできませんでした。");}}
  return <main className={styles.page}>
    <div className={styles.preview}>{localOnly?"未公開・サンプル専用の運営確認":"運営用・確認と投稿準備"}</div>
    <h1>座席報告を確認して、更新を準備</h1><p>{event.title}<br/>{event.date} · {event.session} · {event.venue}</p>
    <p className={styles.note}>内容の照合と座席の位置・配置の確定は別です。未確認の番号や区画を追加しません。</p>
    {!localOnly&&<label className={styles.field}>運営キー<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}/><small>この画面のメモリだけで保持します。URLやブラウザ保存領域には保存しません。</small></label>}
    <div className={styles.actions}><button className={styles.secondary} disabled={busy} onClick={()=>void load()}>最新の報告を読む</button><button className={styles.primary} disabled={busy||!data} onClick={()=>void load({action:"prepare"})}>変更を確認して更新素材を準備</button></div>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
    {pngFile&&<p><a href={pngFile.url} download={pngFile.name}>作成したPNGを保存</a><small> 作成時点の画像です。次の投稿時には最新版を作成してください。</small></p>}
    {data&&<>
      <section className={styles.section}><h2>報告の確認</h2><label className={styles.field}>状態<select value={filter} onChange={e=>{setFilter(e.target.value);setListPage(0);}}><option value="received">確認待ち</option><option value="accepted">内容照合済み</option><option value="rejected">除外</option><option value="withdrawn">本人撤回</option><option value="all">すべて</option></select></label>
        <p>{filtered.length}件 · {listPage+1}ページ</p><ul className={styles.rows}>{filtered.slice(listPage*20,listPage*20+20).map(r=><li key={r.id}><strong>{r.block} · {r.row}列 · {r.number}番</strong><p>{r.status==="received"?"確認待ち":r.status==="accepted"?"内容照合済み":r.status==="withdrawn"?"本人撤回":"除外"}</p>{r.reason&&<p>{r.reason}</p>}{r.evidenceUrl&&<a href={r.evidenceUrl} target="_blank" rel="noopener noreferrer">照合した出典</a>}<button className={styles.secondary} disabled={busy||r.status==="withdrawn"} onClick={()=>{setSelected(r.id);setReason("");setEvidence("");}}>この報告を確認</button></li>)}</ul>
        <div className={styles.actions}><button className={styles.secondary} disabled={!listPage} onClick={()=>setListPage(p=>p-1)}>前の20件</button><button className={styles.secondary} disabled={(listPage+1)*20>=filtered.length} onClick={()=>setListPage(p=>p+1)}>次の20件</button></div>
        {report&&<div className={styles.separate}><h3>{report.block} {report.row}列 {report.number}番の確認結果</h3><label className={styles.field}>判定<select value={decision} onChange={e=>setDecision(e.target.value as ReviewDecision)}><option value="received">確認待ちに戻す</option><option value="accepted">内容を照合済みにする</option><option value="rejected">集計から除外する</option></select></label><label className={styles.field}>理由・照合内容<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={500}/></label><label className={styles.field}>根拠URL（照合済みには必須）<input type="url" value={evidence} onChange={e=>setEvidence(e.target.value)} maxLength={1000}/></label><button className={styles.primary} disabled={busy||reason.trim().length<5} onClick={()=>void moderate()}>確認結果を保存</button></div>}
      </section>
      <section className={styles.section}><h2>投稿に使う更新素材</h2><p>同じ内容は重複生成しません。画像・文章は同じ保存版です。Xへは自動送信しません。</p>
        {stale&&<p role="status" className={styles.note}>集計が変わっています。「変更を確認して更新素材を準備」で最新版にしてください。</p>}{pack?<><p>{new Date(pack.preparedAt).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"})} JST · 版 {pack.id.slice(0,12)}</p><p className={styles.note}>{pack.correction?"訂正・撤回を含む更新です。以前の投稿への訂正案内も確認してください。":pack.previousId?"前回投稿から追加 "+pack.added+"組・除外 "+pack.removed+"組。":"初回の集計です。過去のX投稿との比較基準はまだありません。"}</p><div className={styles.image}><CampaignImage summary={pack.summary} localOnly={localOnly} page={page} svgRef={svg}/></div><div className={styles.actions}><button className={styles.secondary} disabled={!page} onClick={()=>setPage(p=>p-1)}>前の画像</button><button className={styles.secondary} disabled={(page+1)*5>=campaignImageRows(pack.summary.rows).length} onClick={()=>setPage(p=>p+1)}>次の画像</button><button className={styles.primary} disabled={busy||!!error||stale} onClick={()=>void png()}>この版のPNGを保存</button></div>
        {pack.drafts.map(d=><div key={d.kind} className={styles.draft}><h3>{d.kind}</h3><textarea aria-label={`${d.kind}の投稿文`} readOnly value={d.text}/><p>{d.weight}/280</p><button className={styles.secondary} disabled={d.weight>280||!!error||stale} onClick={()=>void copy(d.text)}>コピー</button></div>)}
        <div className={styles.separate}><label className={styles.field}>実際にXへ投稿したURL<input type="url" value={postUrl} onChange={e=>setPostUrl(e.target.value)} placeholder="https://x.com/.../status/..."/></label><button className={styles.secondary} disabled={busy||!postUrl||!!error} onClick={()=>void load({action:"posted",id:pack.id,url:postUrl})}>この版を投稿した記録を保存</button><p className={styles.small}>投稿自体は行いません。内容が古くなっていた場合は記録を止め、最新版の準備を案内します。</p></div></>:<p>新しい報告が届くと、更新素材を準備します。</p>}
      </section>
      <section className={styles.section}><h2>募集投稿ごとの結果</h2><p className={styles.small}>本人入力数と回答人数は別です。GAの到達・開始と、保存先の照合済み件数を同じ投稿IDで比較できます。件数の増加だけで投稿の効果とは断定しません。</p><ul className={styles.rows}>{data.metrics.map(m=><li key={m.source+":"+m.postId}><strong>{m.source} · {m.postId}</strong><p>受付{m.received}件／現在{m.active}件／内容照合済み{m.accepted}件／除外・撤回{m.excluded}件／座席情報{m.uniqueLocations}組</p></li>)}</ul></section>
    </>}
  </main>;
}
