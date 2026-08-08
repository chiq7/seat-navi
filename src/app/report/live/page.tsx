"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, CheckCircle2, ChevronLeft, RotateCcw, Send, X } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { anonymousSupabase, supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { AccountLink } from "@/components/auth/AccountLink";
import { EventCarouselPicker } from "@/components/common/EventPicker";
import { ShareButton } from "@/components/common/ShareButton";

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

function toSeatAreaType(seatArea: string, standFloor: string): string {
  if (seatArea === "アリーナ") return "arena";
  if (seatArea === "スタンド") {
    if (standFloor === "2階") return "stand_2f";
    if (standFloor === "3階以上") return "stand_3f_or_higher";
    return "stand_1f";
  }
  if (seatArea === "1階席") return "stand_1f";
  if (seatArea === "2階席以上") return "stand_2f";
  return "other_unknown";
}

const STAND_DIRECTIONS = ["1塁側", "3塁側", "外野", "その他", "北", "南", "西", "東"] as const;
const STAND_FLOORS = ["1階", "2階", "3階以上", "その他"] as const;

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
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden border border-[#ded8dc] bg-[#f7f5f6]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="zr-focus absolute right-0 top-0 flex h-11 w-11 items-center justify-center bg-gray-900/70 text-white"
        aria-label="写真を削除"
      >
        <X size={10} />
      </button>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  const steps = [
    { num: 1, label: "公演" },
    { num: 2, label: "見え方" },
    { num: 3, label: "完了" },
  ];
  return (
    <div className="zr-container flex items-start justify-between border-b border-[#ded8dc] py-5">
      {steps.map((s, i) => (
        <div key={s.num} className="flex min-w-0 flex-1 items-start last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-7 w-7 items-center justify-center border text-[10px] font-black transition-colors ${
                step >= s.num ? "border-[#f43679] bg-[#f43679] text-white" : "border-[#cfc7cc] text-[#958d93]"
              }`}
            >
              {s.num}
            </div>
            <span
              className={`mt-1.5 text-[9px] font-black ${
                step >= s.num ? "text-[#f43679]" : "text-[#958d93]"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mt-3 h-px flex-1 transition-colors ${
                step > s.num ? "bg-[#f43679]" : "bg-[#ded8dc]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Btn({
  selected,
  onClick,
  children,
  xs = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  xs?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`zr-focus min-h-11 w-full border transition-colors ${xs ? "text-[10px]" : "text-[11px]"} ${
        selected
          ? "border-[#f43679] bg-[#f43679] font-black text-white"
          : "border-[#ded8dc] bg-white font-black text-[#544e52]"
      }`}
    >
      {children}
    </button>
  );
}

function SuccessScreen({
  onOther,
  artistSlug,
  artistName,
  reportId,
  event,
}: {
  onOther: () => void;
  artistSlug: string | null;
  artistName: string | null;
  reportId: string | null;
  event: EventRow | null;
}) {
  const reportUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${
    reportId ? `/report/live/detail?reportId=${reportId}` : artistSlug ? `/artists/${artistSlug}/after-reports` : "/"
  }`;
  const shareText = `${artistName ? `${artistName} ` : ""}${event?.venue ?? "ライブ会場"}の現地レポを投稿しました！ 座席からの見え方を共有します #ちけレポ`;
  const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(reportUrl)}`;

  return (
    <div className="community-page relative flex flex-col">
      <header className="relative z-10 flex h-16 items-center justify-center">
        <Link
          href="/report"
          className="zr-focus absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2b252b] shadow-sm"
          aria-label="報告メニューへ戻る"
        >
          <ChevronLeft size={24} strokeWidth={2.7} />
        </Link>
        <p className="community-eyebrow">REPORT COMPLETE</p>
      </header>

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
            <div className="mt-7 border-y border-white/18 py-4">
              <p className="text-[10px] font-black tracking-[0.12em] text-white/42">SHARED LIVE</p>
              <p className="mt-2 text-[15px] font-black">{event.venue}</p>
              <p className="mt-1 truncate text-[11px] font-bold text-white/55">{event.title}</p>
            </div>
          )}
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
            className="zr-focus flex min-h-14 items-center justify-center gap-3 bg-[#1c171b] px-6 text-[13px] font-black text-white"
          >
            <span className="text-[18px]">𝕏</span>Xで共有する
          </a>
          <ShareButton
            url={reportUrl}
            text={shareText}
            className="zr-focus flex min-h-14 w-full items-center justify-center gap-3 bg-[#f43679] px-6 text-[13px] font-black text-white"
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
              現地レポ一覧を見る →
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

export default function LiveReportPage() {
  return (
    <Suspense fallback={null}>
      <LiveReportPageInner />
    </Suspense>
  );
}

function LiveReportPageInner() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [seatArea, setSeatArea] = useState("");
  const [blockInfo, setBlockInfo] = useState("");
  const [row, setRow] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [standDirection, setStandDirection] = useState("");
  const [standDirectionOther, setStandDirectionOther] = useState("");
  const [standFloor, setStandFloor] = useState("");
  const [standFloorOther, setStandFloorOther] = useState("");
  const [otherSeatInfo, setOtherSeatInfo] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [perf, setPerf] = useState<Record<PerfKey, PerfValue>>(EMPTY_PERF);
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedArtistSlug, setSubmittedArtistSlug] = useState<string | null>(null);
  const [submittedArtistName, setSubmittedArtistName] = useState<string | null>(null);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [submittedEvent, setSubmittedEvent] = useState<EventRow | null>(null);

  useEffect(() => {
    async function load() {
      const preselectedEventId = searchParams.get("event");

      let anchorEvent: EventRow | null = null;
      if (preselectedEventId) {
        const { data: single } = await supabase
          .from("events")
          .select("id, title, venue, venue_id, date, artist_slug")
          .eq("id", preselectedEventId)
          .maybeSingle();
        anchorEvent = (single as EventRow) ?? null;
      }

      const targetArtistSlug = anchorEvent
        ? (anchorEvent.artist_slug ?? resolveArtist(anchorEvent)?.slug ?? null)
        : null;

      let rows: EventRow[];
      if (targetArtistSlug) {
        rows = (await getEventsForArtist(targetArtistSlug)) as EventRow[];
      } else {
        const { data } = await supabase
          .from("events")
          .select("id, title, venue, venue_id, date, artist_slug")
          .order("date", { ascending: false })
          .limit(50);
        rows = (data ?? []) as EventRow[];
      }
      if (anchorEvent && !rows.some((r) => r.id === anchorEvent!.id)) {
        rows = [anchorEvent, ...rows];
      }

      setEvents(rows);
      const initial = preselectedEventId && rows.some((r) => r.id === preselectedEventId)
        ? preselectedEventId
        : rows[0]?.id;
      if (initial) setSelectedEvent(initial);
      setEventsLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPerfValue = (key: PerfKey, value: PerfValue) =>
    setPerf((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setSeatArea("");
    setBlockInfo("");
    setRow("");
    setSeatNumber("");
    setStandDirection("");
    setStandDirectionOther("");
    setStandFloor("");
    setStandFloorOther("");
    setOtherSeatInfo("");
    setPhotos([]);
    setPerf(EMPTY_PERF);
    setMemo("");
    setError("");
  };

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const uploadedPaths: string[] = [];
      for (const file of photos) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${randomId()}.${ext}`;
        const { error: uploadErr } = await anonymousSupabase.storage
          .from("after-report-photos")
          .upload(path, file, { contentType: file.type });
        if (uploadErr) throw new Error(`写真のアップロードに失敗しました: ${uploadErr.message}`);
        uploadedPaths.push(path);
      }

      const reportId = randomId();
      const dbRow = {
        id:                        reportId,
        user_id:                   null,
        event_id:                  selectedEvent,
        seat_area_type:            toSeatAreaType(seatArea, standFloor),
        seat_block:                blockInfo.trim(),
        seat_row:                  row.trim()        || null,
        seat_number:               seatNumber.trim() || null,
        photo_paths:               uploadedPaths,
        seat_view_photo_paths:     uploadedPaths,
        trolley_photo_paths:       [] as string[],
        audience_walk_photo_paths: [] as string[],
        main_stage:                perf.mainstage || null,
        center_stage:              perf.censtage  || null,
        fansa_rating:              perf.fansa     || null,
        torokko:                   perf.torocco   || null,
        torokko_route:             null,
        kyakukudari:               perf.kyakuori  || null,
        kyakukudari_route:         null,
        silver_tape_rows:          perf.ginte === "あり" ? 1 : perf.ginte === "なし" ? 0 : null,
        memo:                      memo || null,
      };

      const { error: dbErr } = await anonymousSupabase.from("after_reports").insert(dbRow);
      if (dbErr) throw new Error(dbErr.message);

      const ev = events.find(e => e.id === selectedEvent);
      setSubmittedArtistSlug(ev ? (resolveArtist(ev)?.slug ?? null) : null);
      setSubmittedArtistName(ev ? (resolveArtist(ev)?.name ?? null) : null);
      setSubmittedReportId(reportId);
      setSubmittedEvent(ev ?? null);
      trackEvent("report_submit", {
        report_type: "live",
        event_id: selectedEvent,
        has_comment: Boolean(memo.trim()),
        has_photo: photos.length > 0,
      });
      setSubmitted(true);
    } catch (err) {
      setError("投稿に失敗しました: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedVenue = events.find((e) => e.id === selectedEvent)?.venue ?? "";
  const currentVenueType = selectedVenue ? getVenueType(selectedVenue) : "arena_dome_stadium";
  const seatAreaOptions = SEAT_AREAS[currentVenueType];
  const reportEntryHref = selectedEvent ? `/report?event=${selectedEvent}` : "/report";

  const step1CanProceed = (() => {
    if (!seatArea) return false;
    if (currentVenueType === "arena_dome_stadium") {
      if (seatArea === "アリーナ") return blockInfo.trim() !== "";
      if (seatArea === "スタンド") return standDirection !== "";
      if (seatArea === "その他") return otherSeatInfo.trim() !== "";
      return false;
    }
    return blockInfo.trim() !== "";
  })();
  if (submitted) {
    return (
      <div className="community-page font-sans">
        <div className="min-h-screen w-full">
          <SuccessScreen
            onOther={() => {
              setSelectedEvent(events[0]?.id ?? "");
              resetForm();
              setStep(1);
              setSubmitted(false);
            }}
            artistSlug={submittedArtistSlug}
            artistName={submittedArtistName}
            reportId={submittedReportId}
            event={submittedEvent}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="community-page font-sans">
      <section className="community-hero">
        <header className="zr-container flex h-16 items-center justify-between">
          {step === 1 ? (
            <Link href={reportEntryHref} aria-label="報告メニューへ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2b252b] shadow-sm"><ChevronLeft size={26} /></Link>
          ) : (
            <button type="button" onClick={() => setStep(step - 1)} aria-label="前のステップへ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2b252b] shadow-sm"><ChevronLeft size={26} /></button>
          )}
          <AccountLink iconSize={22} />
        </header>
        <div className="zr-container pb-9 pt-4">
          <Camera size={28} strokeWidth={1.6} className="text-[#dd8053]" aria-hidden="true" />
          <p className="community-eyebrow mt-5">LIVE VIEW REPORT</p>
          <h1 className="community-title mt-3">その席からの景色を、<br /><span className="text-[#dd8053]">次のファンへ。</span></h1>
          <p className="community-subtitle mt-4">座席・見え方・会場の写真をまとめて共有できます。</p>
        </div>
      </section>

        <StepIndicator step={step} />

        {/* Step 1：公演・座席・写真 */}
        {step === 1 && (
          <main className="zr-container space-y-8 pb-12 pt-8">
            {/* 公演選択 */}
            <section className="community-panel p-5">
              <div className="mb-0.5">
                <p className="artist-kicker">01 / SELECT LIVE</p>
                <h2 className="artist-heading">報告する公演</h2>
              </div>
              <EventCarouselPicker
                events={events}
                selectedEventId={selectedEvent}
                loading={eventsLoading}
                onSelect={(id) => {
                  const targetEvent = events.find((e) => e.id === id);
                  if (targetEvent) {
                    const newVenueType = getVenueType(targetEvent.venue);
                    const areas = SEAT_AREAS[newVenueType];
                    if (seatArea !== "" && !areas.includes(seatArea)) {
                      setSeatArea("");
                      setBlockInfo("");
                      setRow("");
                      setSeatNumber("");
                      setStandDirection("");
                      setStandDirectionOther("");
                      setStandFloor("");
                      setStandFloorOther("");
                      setOtherSeatInfo("");
                    }
                  }
                  setSelectedEvent(id);
                }}
              />
            </section>

            {/* 座席情報 */}
            <section className="community-panel p-4 sm:p-5">
              <p className="artist-kicker">SEAT DETAIL</p>
              <h2 className="artist-heading">どの席から見た？</h2>
              <p className="mb-3 mt-0.5 text-[9px] text-gray-400">
                座席エリアを選んでから詳細を入力してください。
              </p>
              <div className="space-y-3">
                {/* 座席エリア（必須） */}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold text-gray-700">
                    座席エリア<span className="ml-1 text-[#FF6B9D]">必須</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {seatAreaOptions.map((v) => (
                      <Btn
                        key={v}
                        selected={seatArea === v}
                        onClick={() => {
                          setBlockInfo("");
                          setRow("");
                          setSeatNumber("");
                          setStandDirection("");
                          setStandDirectionOther("");
                          setStandFloor("");
                          setStandFloorOther("");
                          setOtherSeatInfo("");
                          setSeatArea(seatArea === v ? "" : v);
                        }}
                      >
                        {v}
                      </Btn>
                    ))}
                  </div>
                </div>

                {/* アリーナ */}
                {seatArea === "アリーナ" && currentVenueType === "arena_dome_stadium" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        ブロック<span className="ml-0.5 text-red-400">*</span>
                      </span>
                      <input
                        type="text"
                        value={blockInfo}
                        onChange={(e) => setBlockInfo(normalizeSeatField(e.target.value, "ブロック"))}
                        placeholder="例：A10 / センターA"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        列
                      </span>
                      <input
                        type="text"
                        value={row}
                        onChange={(e) => setRow(normalizeSeatField(e.target.value, "列"))}
                        placeholder="例：3"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        席番号
                      </span>
                      <input
                        type="text"
                        value={seatNumber}
                        onChange={(e) => setSeatNumber(normalizeSeatNumber(e.target.value))}
                        placeholder="例：1"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                  </div>
                )}

                {/* スタンド */}
                {seatArea === "スタンド" && currentVenueType === "arena_dome_stadium" && (
                  <>
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold text-gray-700">
                        席種・方向<span className="ml-1 text-[#FF6B9D]">必須</span>
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {STAND_DIRECTIONS.map((v) => (
                          <Btn
                            key={v}
                            selected={standDirection === v}
                            onClick={() => {
                              if (standDirection === v) {
                                setStandDirection("");
                                setStandDirectionOther("");
                              } else {
                                if (v !== "その他") setStandDirectionOther("");
                                setStandDirection(v);
                              }
                            }}
                            xs
                          >
                            {v}
                          </Btn>
                        ))}
                      </div>
                      {standDirection === "その他" && (
                        <input
                          type="text"
                          value={standDirectionOther}
                          onChange={(e) => setStandDirectionOther(e.target.value)}
                          placeholder="例：バックネット側 / 200レベル / 上手側 / 下手側"
                          className="mt-2 h-[42px] w-full rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                        />
                      )}
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold text-gray-700">
                        階層<span className="ml-1 text-[9px] font-normal text-gray-400">任意</span>
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {STAND_FLOORS.map((v) => (
                          <Btn
                            key={v}
                            selected={standFloor === v}
                            onClick={() => {
                              if (standFloor === v) {
                                setStandFloor("");
                                setStandFloorOther("");
                              } else {
                                if (v !== "その他") setStandFloorOther("");
                                setStandFloor(v);
                              }
                            }}
                            xs
                          >
                            {v}
                          </Btn>
                        ))}
                      </div>
                      {standFloor === "その他" && (
                        <input
                          type="text"
                          value={standFloorOther}
                          onChange={(e) => setStandFloorOther(e.target.value)}
                          placeholder="例：上段 / 下段 / 200レベル"
                          className="mt-2 h-[42px] w-full rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        列
                      </span>
                      <input
                        type="text"
                        value={row}
                        onChange={(e) => setRow(normalizeSeatField(e.target.value, "列"))}
                        placeholder="例：3"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        席番号
                      </span>
                      <input
                        type="text"
                        value={seatNumber}
                        onChange={(e) => setSeatNumber(normalizeSeatNumber(e.target.value))}
                        placeholder="例：1"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                  </>
                )}

                {/* arena_dome_stadium その他 */}
                {seatArea === "その他" && currentVenueType === "arena_dome_stadium" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        席種<span className="ml-0.5 text-red-400">*</span>
                      </span>
                      <input
                        type="text"
                        value={otherSeatInfo}
                        onChange={(e) => setOtherSeatInfo(e.target.value)}
                        placeholder="例：立見 / 整理番号A / 特殊席"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        列
                      </span>
                      <input
                        type="text"
                        value={row}
                        onChange={(e) => setRow(normalizeSeatField(e.target.value, "列"))}
                        placeholder="例：3"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        席番号
                      </span>
                      <input
                        type="text"
                        value={seatNumber}
                        onChange={(e) => setSeatNumber(normalizeSeatNumber(e.target.value))}
                        placeholder="例：1"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                  </div>
                )}

                {/* hall_theater / livehouse_other */}
                {seatArea !== "" && currentVenueType !== "arena_dome_stadium" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        ブロック<span className="ml-0.5 text-red-400">*</span>
                      </span>
                      <input
                        type="text"
                        value={blockInfo}
                        onChange={(e) => setBlockInfo(normalizeSeatField(e.target.value, "ブロック"))}
                        placeholder="例：1階A列 / バルコニー上手"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        列
                      </span>
                      <input
                        type="text"
                        value={row}
                        onChange={(e) => setRow(normalizeSeatField(e.target.value, "列"))}
                        placeholder="例：3"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                        席番号
                      </span>
                      <input
                        type="text"
                        value={seatNumber}
                        onChange={(e) => setSeatNumber(normalizeSeatNumber(e.target.value))}
                        placeholder="例：1"
                        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                      />
                    </div>
                  </div>
                )}

                <p className="text-[9px] text-gray-400">
                  大まかで構いません。写真があれば位置が伝わりやすいです。
                </p>
              </div>
            </section>

            {/* 写真（任意） */}
            <section className="border-t border-[#ded8dc] pt-5">
              <div className="mb-1 flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-gray-900">ステージが見える写真</p>
                <span className="text-[9px] text-gray-400">任意</span>
              </div>
              <p className="mb-3 text-[9px] text-gray-400">
                席から見た実際の風景を優先してください。スマホの写真でOKです。
              </p>
              <input
                ref={photoInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPhotos((prev) => [...prev, ...files].slice(0, 5));
                  e.target.value = "";
                }}
              />
              {photos.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {photos.map((file, i) => (
                    <PhotoThumb
                      key={`${file.name}-${file.lastModified}-${file.size}-${i}`}
                      file={file}
                      onRemove={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </div>
              )}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="zr-focus flex min-h-[120px] w-full flex-col items-center justify-center gap-2 border border-dashed border-[#bfb6bc] bg-white transition-colors hover:border-[#f43679]"
                >
                  <Camera size={24} className="text-gray-300" />
                  <p className="text-[10px] text-gray-400">
                    {photos.length === 0 ? "席からの見え方写真を選ぶ" : `写真を追加（${photos.length}/5）`}
                  </p>
                </button>
              )}
            </section>

            {/* 見え方の感想・補足（任意） */}
            <section className="border-t border-[#ded8dc] pt-5">
              <div className="mb-1 flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-gray-900">見え方の感想・補足</p>
                <span className="text-[9px] text-gray-400">任意</span>
              </div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value.slice(0, 300))}
                className="zr-focus mt-3 h-32 w-full resize-none border border-[#ded8dc] bg-white p-3 text-[12px] font-medium leading-6 outline-none placeholder:text-[#b5adb2] focus:border-[#f43679]"
                placeholder="例：前の方だったので表情までよく見えました。少し端でしたが全体はしっかり見えました。"
              />
              <div className="mt-1 text-right text-[9px] text-gray-400">
                {memo.length} / 300
              </div>
            </section>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => { if (step1CanProceed) setStep(2); }}
                disabled={!step1CanProceed}
                className={`zr-focus flex min-h-[52px] w-full items-center justify-center text-[13px] font-black text-white transition-opacity ${
                  step1CanProceed
                    ? "bg-[#f43679]"
                    : "cursor-not-allowed bg-[#f43679]/35"
                }`}
              >
                次へ進む
              </button>
            </div>
          </main>
        )}

        {/* Step 2：見え方チェック */}
        {step === 2 && (
          <main className="zr-container space-y-7 pb-12 pt-8">
            <section className="border-t border-[#1c171b] pt-5">
              <p className="artist-kicker">02 / VIEW RATING</p>
              <h2 className="artist-heading">見え方チェック</h2>
              <p className="mb-4 mt-0.5 text-[9px] text-gray-400">見え方を教えてください</p>
              <div className="space-y-4">
                {/* メインステージ・センステ・ファンサ・トロッコ・客降り（5段階） */}
                {RATING_ITEMS.map((item) => (
                  <div key={item.key}>
                    <p className="mb-1.5 text-[11px] font-bold text-gray-800">{item.label}</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {RATING_OPTIONS.map((v) => (
                        <Btn
                          key={v}
                          selected={perf[item.key] === v}
                          onClick={() => setPerfValue(item.key, perf[item.key] === v ? "" : v)}
                          xs
                        >
                          {v}
                        </Btn>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between px-0.5 text-[8px] text-gray-400">
                      <span>見えにくい</span>
                      <span>見やすい</span>
                    </div>
                  </div>
                ))}

                {/* 銀テ */}
                <div>
                  <p className="mb-1.5 text-[11px] font-bold text-gray-800">銀テ取れた？</p>
                  <div className="grid grid-cols-3 gap-2">
                    {GINTE_OPTIONS.map((v) => (
                      <Btn
                        key={v}
                        selected={perf.ginte === v}
                        onClick={() => setPerfValue("ginte", perf.ginte === v ? "" : v)}
                        xs
                      >
                        {v}
                      </Btn>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {error && (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-bold text-red-600">{error}</div>
            )}

            <div className="mt-5">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="zr-focus flex min-h-[52px] w-full items-center justify-center gap-2 bg-[#f43679] text-[13px] font-black text-white transition-opacity disabled:opacity-50"
              >
                <Send size={16} aria-hidden="true" />
                {submitting ? "投稿中..." : "投稿する"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="zr-focus mt-2 flex min-h-12 w-full items-center justify-center border border-[#ded8dc] bg-transparent text-[12px] font-black text-[#817981]"
              >
                戻る
              </button>
            </div>
          </main>
        )}

    </div>
  );
}
