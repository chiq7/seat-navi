"use client";

import { getEventDisplayVenueName } from "@/lib/publicVenueGuides";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, CheckCircle2, RotateCcw, Send, X } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { anonymousSupabase, getPostingContext } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { ReportPerformancePicker, useReportEventSelection } from "@/components/report/ReportPerformancePicker";
import { liveReportAreaCode, submitLiveReport, type LivePhoto, type LiveReportAttempt } from "@/lib/liveReportSubmission";
import { CompactHeroIntro } from "@/components/common/CompactHeroIntro";
import { ShareButton } from "@/components/common/ShareButton";
import { Header } from "@/components/common/Header";
import { PageLoadingShell } from "@/components/common/PageLoadingShell";
import { FormActionButton, FormActionGroup } from "@/components/common/FormActions";
import { ReportChoiceButton as Btn } from "@/components/report/ReportChoiceButton";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

/** 全角英数字を半角化し、アルファベットを大文字化する（座席系入力用） */
function toHalfWidthUpper(v: string): string {
  return v
    .replace(/[０-９Ａ-Ｚａ-ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toUpperCase();
}

/** 座席系入力の自動整形: 全角→半角・大文字化・末尾の単位(ブロック/列/番)の重複除去 */
function normalizeSeatField(v: string, suffix: string): string {
  const converted = toHalfWidthUpper(v);
  return converted.endsWith(suffix) ? converted.slice(0, -suffix.length) : converted;
}

/** 席番号の自動整形: 全角→半角・末尾の「番」除去に加え、数字以外を許可しない */
function normalizeSeatNumber(v: string): string {
  return normalizeSeatField(v, "番").replace(/[^0-9]/g, "");
}

type VenueType = "arena_dome_stadium" | "hall_theater" | "livehouse_other";

const SEAT_AREAS: Record<VenueType, string[]> = {
  arena_dome_stadium: ["アリーナ", "スタンド", "その他"],
  hall_theater: ["1階席", "2階席以上", "バルコニー", "その他"],
  livehouse_other: ["指定席", "スタンディング", "整理番号", "その他"],
};

type EventRow = { id: string; title: string; venue: string; venue_id?: string | null; date: string | null; artist_slug?: string | null };

function getVenueType(venue: string): VenueType {
  if (/ドーム|アリーナ|スタジアム|Stadium|Arena|Dome/i.test(venue)) return "arena_dome_stadium";
  if (/ホール|Hall|劇場|シアター|Theater|Theatre/i.test(venue)) return "hall_theater";
  if (/ライブハウス|Zepp|zepp|ZEPP/.test(venue)) return "livehouse_other";
  return "arena_dome_stadium";
}

type PerfKey = "mainstage" | "censtage" | "fansa" | "torocco" | "kyakuori" | "ginte";
type PerfValue = "あり" | "なし" | "わからない" | "1" | "2" | "3" | "4" | "5" | "";

// 表示順: メインステージ→センステ→ファンサ→トロッコ→客降り→銀テ
const RATING_ITEMS: { key: "mainstage" | "censtage" | "fansa" | "torocco" | "kyakuori"; label: string }[] = [
  { key: "mainstage", label: "メインステージ" },
  { key: "censtage", label: "センステ" },
  { key: "fansa", label: "ファンサ" },
  { key: "torocco", label: "トロッコ" },
  { key: "kyakuori", label: "客降り" },
];

const RATING_OPTIONS = ["なし", "1", "2", "3", "4", "5"] as const;
const GINTE_OPTIONS = ["あり", "なし", "わからない"] as const;

const EMPTY_PERF: Record<PerfKey, PerfValue> = {
  mainstage: "",
  censtage: "",
  torocco: "",
  kyakuori: "",
  fansa: "",
  ginte: "",
};

function PhotoThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return (
    <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden border border-[#ded8dc] bg-[#f7f5f6]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="zr-focus absolute right-0 top-0 flex h-11 w-11 items-center justify-center bg-[#704e60]/85 text-white"
        aria-label="写真を削除"
      >
        <X size={10} />
      </button>
    </div>
  );
}

function SuccessScreen({
  onOther,
  artistSlug,
  artistName,
  reportId,
  event,
  seatSummary,
  memo,
}: {
  onOther: () => void;
  artistSlug: string | null;
  artistName: string | null;
  reportId: string | null;
  event: EventRow | null;
  seatSummary: string;
  memo: string;
}) {
  const reportUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${
    reportId ? `/report/live/detail?reportId=${reportId}` : artistSlug ? `/artists/${artistSlug}/after-reports` : "/"
  }`;
  const shareText = `${artistName ? `${artistName} ` : ""}${event?.venue ?? "ライブ会場"}の現地レポを投稿しました！ 座席からの見え方を共有します #ちけレポ`;
  const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(reportUrl)}`;

  return (
    <div className="community-page relative flex flex-col">
      <Header breadcrumbParents={[{ href: "/report", label: "レポートを投稿" }]} title="投稿完了" backHref="/report" backLabel="報告メニューへ戻る" />

      <section className="community-hero pb-12 pt-5 sm:pb-16" aria-labelledby="success-title">
        <div className="zr-container">
          <CheckCircle2 size={38} strokeWidth={1.6} className="text-[#ff5b96]" />
          <p className="mt-6 text-[10px] font-black tracking-[0.24em] text-[#ff5b96]">YOUR VIEW IS LIVE</p>
          <h1 id="success-title" className="mt-3 text-[39px] font-black leading-[1.08] tracking-[-0.055em] sm:text-[58px]">
            投稿できました。<br />次は、ファンへ届けよう。
          </h1>
          <p className="community-subtitle mt-5 max-w-[620px]">
            あなたの座席から見えた景色が、次にこの会場へ行くファンの参考になります。
          </p>
          {event && (
            <div className="mt-7 border-y border-[#eadfe4] py-4">
              <p className="text-[10px] font-black tracking-[0.12em] text-[#a2939b]">SHARED LIVE</p>
              <p className="mt-2 text-[15px] font-black">{getEventDisplayVenueName(event.venue_id, event.venue)}</p>
              <p className="mt-1 truncate text-[11px] font-bold text-[#81747c]">{event.title}</p>
              {seatSummary && <p className="mt-2 text-[12px] font-bold text-[#f43679]">{seatSummary}</p>}
              {memo && <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-5 text-[#81747c]">{memo}</p>}
            </div>
          )}
          {reportId && <Link href={`/report/live/detail?reportId=${encodeURIComponent(reportId)}`} className="community-secondary-button mt-3 min-h-11">投稿した現地レポを見る</Link>}
        </div>
      </section>

      <section className="zr-container flex-1 py-6" aria-labelledby="share-title">
        <p className="artist-kicker">Share Report</p>
        <h2 id="share-title" className="artist-heading">この現地レポを共有</h2>
        <p className="mt-3 text-[12px] font-medium leading-6 text-[#817981]">Xでファンへ届けるか、スマホの共有メニューから送れます。</p>

        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <a
            href={xShareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="community-primary-button min-h-14"
          >
            <span className="text-[18px]">𝕏</span>Xで共有する
          </a>
          <ShareButton
            url={reportUrl}
            text={shareText}
            className="community-secondary-button min-h-14 w-full"
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onOther}
            className="community-secondary-button min-h-16 gap-2 px-4"
          >
            <RotateCcw size={16} className="text-[#f43679]" />別の現地レポを投稿
          </button>
          {artistSlug && (
            <Link
              href={`/artists/${artistSlug}/after-reports`}
              className="community-secondary-button min-h-16 px-4"
            >
              現地レポ一覧を見る
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export default function LiveReportPage() {
  const hydrated = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const loading = <PageLoadingShell title="現地レポを投稿" eyebrow="SHARE THE LIVE" heading="現地レポを投稿" backHref="/report" backLabel="報告ページに戻る" blocks={3} />;
  // 公演のプリセットはブラウザのURLから取得する。静的HTMLでも見出しを1つ表示する。
  if (!hydrated) return loading;
  return <Suspense fallback={loading}><LiveReportPageInner /></Suspense>;
}

const fieldClass = "zr-focus min-h-11 w-full rounded-lg border border-[#d9cdd4] bg-white px-3 text-base";

function LiveReportPageInner() {
  const query = useSearchParams();
  return <LiveReportForm key={query.toString()} presetQuery={query.toString()} />;
}

function LiveReportForm({ presetQuery }: { presetQuery: string }) {
  const selection = useReportEventSelection();
  const { selectedEventRow: event } = selection;
  const [seatArea, setSeatArea] = useState("");
  const [block, setBlock] = useState("");
  const [row, setRow] = useState("");
  const [number, setNumber] = useState("");
  const [direction, setDirection] = useState("");
  const [floor, setFloor] = useState("");
  const [photos, setPhotos] = useState<LivePhoto[]>([]);
  const [perf, setPerf] = useState(EMPTY_PERF);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const pending = useRef<LiveReportAttempt | null>(null);
  const [retryOnly, setRetryOnly] = useState(false);
  const [completed, setCompleted] = useState<{ id: string; event: EventRow; seat: string; memo: string } | null>(null);
  const menuQuery = new URLSearchParams(presetQuery);
  if (event) menuQuery.set("event", event.id);
  const menuHref = menuQuery.size ? `/report?${menuQuery}` : "/report";
  const areaOptions = SEAT_AREAS[getVenueType(event?.venue ?? "")];
  const canSubmit = Boolean(event && areaOptions.includes(seatArea) && (photos.length || memo.trim()));

  function resetSeat(area: string) {
    setSeatArea(area);
    setBlock("");
    setRow("");
    setNumber("");
    setDirection("");
    setFloor("");
  }

  function resetContent() {
    resetSeat("");
    setPhotos([]);
    setMemo("");
    setPerf(EMPTY_PERF);
    setError("");
  }

  function anotherReport() {
    selection.setSelectedEvent("");
    resetContent();
    setCompleted(null);
  }

  async function handleSubmit() {
    if (!event || !canSubmit || busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError("");
    try {
      const {client, userId} = await getPostingContext();
      const seatDescription = [seatArea, floor.trim(), direction.trim()].filter(Boolean).join("・");
      const paths = photos.map(photo => photo.path);
      const attempt = pending.current ?? {
        row: {
          id: randomId(), event_id: event.id, user_id: userId,
          seat_area_type: liveReportAreaCode(seatArea, floor.trim()), seat_description: seatDescription,
          seat_block: block.trim() || null, seat_row: row.trim() || null, seat_number: number || null,
          photo_paths: paths, seat_view_photo_paths: paths, memo: memo.trim() || null,
          main_stage: perf.mainstage || null, center_stage: perf.censtage || null, fansa_rating: perf.fansa || null,
          torokko: perf.torocco || null, kyakukudari: perf.kyakuori || null,
          silver_tape_rows: perf.ginte === "あり" ? 1 : perf.ginte === "なし" ? 0 : null,
        },
        photos, writingRow: false,
      };
      pending.current = attempt;
      await submitLiveReport(attempt, {
        upload: ({ path, file }) => anonymousSupabase.storage.from("after-report-photos").upload(path, file, { contentType: file.type }),
        insert: data => client.from("after_reports").insert(data),
        matchesExisting: async data => {
          const { data: existing, error: lookupError } = await client.from("after_reports")
            .select("id,event_id,user_id").eq("id", data.id).maybeSingle();
          return !lookupError && existing?.event_id === data.event_id && existing?.user_id === data.user_id;
        },
      });
      setCompleted({ id: attempt.row.id, event, seat: [seatDescription, block].filter(Boolean).join("・"), memo: memo.trim() });
      pending.current = null;
      setRetryOnly(false);
      trackEvent("report_submit", { report_type: "live", event_id: event.id, has_comment: Boolean(memo.trim()), has_photo: photos.length > 0 });
    } catch (e) {
      const uncertain = Boolean(pending.current?.writingRow);
      if (!uncertain) pending.current = null;
      setRetryOnly(uncertain);
      setError(e instanceof Error ? e.message : "投稿を確認できませんでした。もう一度お試しください。");
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  }

  if (completed) {
    const artist = resolveArtist(completed.event);
    return <SuccessScreen onOther={anotherReport} artistSlug={artist?.slug ?? null} artistName={artist?.name ?? null}
      reportId={completed.id} event={completed.event} seatSummary={completed.seat} memo={completed.memo} />;
  }
  return (
    <div className="community-page font-sans">
      <section className="community-hero">
        <Header breadcrumbParents={[{ href: menuHref, label: "レポートを投稿" }]} title="現地レポ" backHref={menuHref} backLabel="報告メニューへ戻る" />
        <CompactHeroIntro eyebrow="LIVE REPORT" title="現地レポを" accent="投稿" subtitle="ログイン不要。席と、写真かひとことを教えてください。" />
      </section>
      <main className="pb-12"><form onSubmit={e => { e.preventDefault(); void handleSubmit(); }}>
        <fieldset disabled={submitting || retryOnly} className="m-0 min-w-0 border-0 p-0">
          <ReportPerformancePicker selection={selection} onSelect={resetContent} />
          <fieldset disabled={!event} className="zr-container min-w-0 space-y-4 pt-3">
            <fieldset>
              <legend className="mb-2 text-sm font-bold">座席エリア</legend>
              <div className="grid grid-cols-3 gap-2">
                {areaOptions.map(area => <Btn key={area} selected={area === seatArea} onClick={() => { if (area !== seatArea) resetSeat(area); }}>{area}</Btn>)}
              </div>
            </fieldset>
            <section aria-labelledby="live-photo-memo">
              <h2 id="live-photo-memo" className="mb-2 text-sm font-bold">写真またはひとこと</h2>
              <textarea aria-label="見え方の感想・補足" rows={2} maxLength={300} className={fieldClass + " py-2"} value={memo}
                onChange={e => setMemo(e.target.value)} placeholder="例：ステージ全体がよく見えました" />
              <label className="relative mt-1 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#d9cdd4] bg-white px-3 text-sm font-bold text-[#702345] focus-within:outline">
                <Camera size={17} aria-hidden="true" /> 写真を選ぶ{photos.length > 0 && `（${photos.length}/5）`}
                <input aria-label="現地レポに添付する写真を選択" type="file" accept="image/*" multiple disabled={photos.length >= 5}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={e => {
                    const files = Array.from(e.target.files ?? []).slice(0, 5 - photos.length);
                    const additions = files.map(file => ({
                      file, path: randomId() + "." + (file.name.match(/\.([a-z0-9]{1,8})$/i)?.[1].toLowerCase() ?? "jpg"), uploaded: false,
                    }));
                    setPhotos(current => [...current, ...additions].slice(0, 5));
                    e.target.value = "";
                  }} />
              </label>
              {!!photos.length && <div className="mt-2 flex flex-wrap gap-2">
                {photos.map(photo => <PhotoThumb key={photo.path} file={photo.file} onRemove={() => setPhotos(current => current.filter(f => f !== photo))} />)}
              </div>}
            </section>
            <details className="rounded-lg border border-[#eadfe4] bg-white px-3">
              <summary className="zr-focus cursor-pointer py-3 text-sm font-bold">座席の詳細・演出の評価（任意）</summary>
              <div className="space-y-4 pb-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label className="text-xs">ブロック<input aria-label="座席ブロック" className={fieldClass} value={block} maxLength={50} onChange={e => setBlock(normalizeSeatField(e.target.value, "ブロック"))} /></label>
                  <label className="text-xs">列<input aria-label="座席の列" className={fieldClass} value={row} maxLength={16} onChange={e => setRow(normalizeSeatField(e.target.value, "列"))} /></label>
                  <label className="text-xs">席番号<input aria-label="座席番号" inputMode="numeric" className={fieldClass} value={number} maxLength={10} onChange={e => setNumber(normalizeSeatNumber(e.target.value))} /></label>
                  <label className="text-xs">階層<input aria-label="階層" className={fieldClass} value={floor} maxLength={30} placeholder="例：2階" onChange={e => setFloor(e.target.value)} /></label>
                  <label className="text-xs">方向・位置<input aria-label="方向・位置" className={fieldClass} value={direction} maxLength={50} placeholder="例：1塁側" onChange={e => setDirection(e.target.value)} /></label>
                </div>
                {RATING_ITEMS.map(item => <fieldset key={item.key}>
                  <legend className="mb-1 text-sm">{item.label}の見えやすさ（5が最高）</legend>
                  <div className="grid grid-cols-6 gap-1">{RATING_OPTIONS.map(v =>
                    <Btn key={v} selected={perf[item.key] === v} onClick={() => setPerf(prev => ({ ...prev, [item.key]: prev[item.key] === v ? "" : v }))}>{v}</Btn>)}</div>
                </fieldset>)}
                <fieldset>
                  <legend className="mb-1 text-sm">銀テープは取れましたか？</legend>
                  <div className="grid grid-cols-3 gap-1">{GINTE_OPTIONS.map(v =>
                    <Btn key={v} selected={perf.ginte === v} onClick={() => setPerf(prev => ({ ...prev, ginte: prev.ginte === v ? "" : v }))}>{v}</Btn>)}</div>
                </fieldset>
              </div>
            </details>
          </fieldset>
        </fieldset>
        <div className="zr-container">
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <FormActionGroup>
            <FormActionButton type="submit" disabled={!canSubmit || submitting}>
              <Send size={16} aria-hidden="true" />{submitting ? "送信中…" : retryOnly ? "もう一度送信する" : "現地レポを投稿する"}
            </FormActionButton>
          </FormActionGroup>
        </div>
      </form></main>
    </div>
  );
}
