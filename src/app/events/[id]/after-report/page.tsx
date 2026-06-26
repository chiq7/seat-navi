"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import { PhotoUpload } from "@/components/after-report/AfterReportFormParts";
import { BottomNav } from "@/components/common/BottomNav";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

const BUCKET = "after-report-photos";

const SEAT_AREA_OPTIONS = [
  { value: "arena",              label: "アリーナ" },
  { value: "stand_1f",           label: "1階" },
  { value: "stand_2f",           label: "2階" },
  { value: "stand_3f_or_higher", label: "3階以上" },
  { value: "other_unknown",      label: "その他" },
] as const;

type RatingValue = "なし" | "1" | "2" | "3" | "4" | "5" | "";
type GinteValue  = "あり" | "なし" | "わからない" | "";

const RATING_ITEMS: { key: "censtage" | "torocco" | "kyakuori" | "fansa"; label: string }[] = [
  { key: "censtage", label: "センタステ" },
  { key: "torocco",  label: "トロッコ" },
  { key: "kyakuori", label: "客降り" },
  { key: "fansa",    label: "ファンサ" },
];
const RATING_OPTIONS = ["なし", "1", "2", "3", "4", "5"] as const;
const GINTE_OPTIONS  = ["あり", "なし", "わからない"] as const;

function fmtDate(d: string | null): string {
  if (!d) return "";
  const [, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(d).getDay()];
  return `${m}/${day}(${w})`;
}

function StepIndicator({ step }: { step: number }) {
  const steps = [
    { num: 1, label: "公演" },
    { num: 2, label: "見え方" },
    { num: 3, label: "完了" },
  ];
  return (
    <div className="flex items-center justify-center py-3">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                step >= s.num ? "bg-[#FF6B9D] text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              {s.num}
            </div>
            <span className={`mt-0.5 text-[9px] font-semibold ${step >= s.num ? "text-[#FF6B9D]" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`mb-4 h-[2px] w-8 transition-colors ${step > s.num ? "bg-[#FF6B9D]" : "bg-gray-200"}`} />
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
      className={`h-8 w-full rounded-lg transition-colors ${xs ? "text-[10px]" : "text-[11px]"} ${
        selected
          ? "bg-[#FF6B9D] font-bold text-white shadow-[0_4px_10px_rgba(255,107,157,0.18)]"
          : "border border-gray-200 bg-white font-semibold text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function AfterReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();

  const [artistSlug, setArtistSlug]     = useState<string | undefined>(undefined);
  const [eventDate, setEventDate]       = useState<string | null>(null);
  const [eventVenue, setEventVenue]     = useState<string | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventNotFound, setEventNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("events")
      .select("title, date, venue")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (data) {
          setArtistSlug(findArtistByKeyword(data.title)?.slug);
          setEventDate(data.date ?? null);
          setEventVenue(data.venue ?? null);
        } else {
          setEventNotFound(true);
        }
        setEventLoading(false);
      });
  }, [eventId]);

  const [step, setStep]           = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Step 1: 座席情報 + 写真 + メモ
  const [seatArea, setSeatArea]                 = useState("");
  const [blockInfo, setBlockInfo]               = useState("");
  const [seatRow, setSeatRow]                   = useState("");
  const [seatNumber, setSeatNumber]             = useState("");
  const [seatViewFiles, setSeatViewFiles]       = useState<File[]>([]);
  const [seatViewPreviews, setSeatViewPreviews] = useState<string[]>([]);
  const [memo, setMemo]                         = useState("");

  // Step 2: 見え方チェック
  const [perf, setPerf] = useState<Record<"censtage" | "torocco" | "kyakuori" | "fansa", RatingValue>>({
    censtage: "", torocco: "", kyakuori: "", fansa: "",
  });
  const [ginte, setGinte] = useState<GinteValue>("");

  const setPerfValue = (key: "censtage" | "torocco" | "kyakuori" | "fansa", value: RatingValue) =>
    setPerf((prev) => ({ ...prev, [key]: value }));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  const step1CanProceed = seatArea !== "" && blockInfo.trim() !== "";

  function resetForm() {
    setSeatArea("");
    setBlockInfo("");
    setSeatRow("");
    setSeatNumber("");
    seatViewPreviews.forEach((p) => URL.revokeObjectURL(p));
    setSeatViewFiles([]);
    setSeatViewPreviews([]);
    setMemo("");
    setPerf({ censtage: "", torocco: "", kyakuori: "", fansa: "" });
    setGinte("");
    setError("");
  }

  async function uploadFiles(files: File[], prefix: string): Promise<string[]> {
    const paths: string[] = [];
    for (const file of files) {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${eventId}/${prefix}/${randomId()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw new Error(upErr.message);
      paths.push(path);
    }
    return paths;
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const seatViewPaths = await uploadFiles(seatViewFiles, "seat_view");

      const dbRow = {
        id:                        randomId(),
        event_id:                  eventId,
        seat_area_type:            seatArea,
        seat_block:                blockInfo.trim(),
        seat_row:                  seatRow.trim()    || null,
        seat_number:               seatNumber.trim() || null,
        photo_paths:               seatViewPaths,
        seat_view_photo_paths:     seatViewPaths,
        trolley_photo_paths:       [] as string[],
        audience_walk_photo_paths: [] as string[],
        center_stage:              perf.censtage  || null,
        torokko:                   perf.torocco   || null,
        torokko_route:             null,
        kyakukudari:               perf.kyakuori  || null,
        kyakukudari_route:         null,
        silver_tape_rows:          ginte === "あり" ? 1 : ginte === "なし" ? 0 : null,
        fansa:                     perf.fansa === "" ? null : perf.fansa !== "なし",
        memo:                      memo || null,
      };

      const { error: dbErr } = await supabase.from("after_reports").insert(dbRow);
      if (dbErr) throw new Error(dbErr.message);

      setSubmitted(true);
    } catch (err) {
      setError("投稿に失敗しました: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  // ローディング
  if (eventLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
      </div>
    );
  }

  // 公演が存在しない
  if (eventNotFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] px-4">
        <p className="text-sm font-bold text-gray-700">公演が見つかりません</p>
        <p className="text-xs text-gray-400">URLをご確認ください</p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-[#FF6B9D] px-6 py-2.5 text-[13px] font-bold text-white"
        >
          ホームへ戻る
        </Link>
      </div>
    );
  }

  // 完了画面
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans">
        <div className="mx-auto min-h-screen w-full max-w-[390px]">
          <div className="relative flex min-h-screen flex-col">
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src="/images/report/success/report-success-bg.png"
                alt=""
                fill
                priority
                className="object-cover object-top"
              />
            </div>
            <header className="relative z-10 flex h-[44px] items-center justify-center border-b border-gray-100 bg-white/80 backdrop-blur-sm">
              <h1 className="text-[12px] font-bold tracking-wide text-gray-900">現地レポを投稿</h1>
            </header>
            <div className="relative z-10 bg-white/80 backdrop-blur-sm">
              <StepIndicator step={3} />
            </div>
            <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
              <div className="w-full rounded-3xl bg-white px-4 pb-8 pt-6 text-center shadow-[0_8px_40px_rgba(17,24,39,0.10)]">
                <div className="mb-4 flex justify-center">
                  <Image
                    src="/images/report/success/report-success-ticket-icon.png"
                    alt=""
                    width={140}
                    height={140}
                    className="object-contain"
                  />
                </div>
                <p className="text-[18px] font-bold text-[#111827]">投稿ありがとうございます！</p>
                <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280]">
                  あなたのレポを受け付けました。
                  <br />
                  現地情報が、次に参戦するみんなの参考になります♪
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    type="button"
                    onClick={() => { resetForm(); setStep(1); setSubmitted(false); }}
                    className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#FF6B9D] text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(255,107,157,0.35)] transition-opacity active:opacity-80"
                  >
                    もう1件投稿する
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/events/${eventId}`)}
                    className="flex h-[48px] w-full items-center justify-center rounded-full border-2 border-[#FF6B9D] bg-white text-[14px] font-bold text-[#FF6B9D] transition-opacity active:opacity-80"
                  >
                    公演ページへ戻る
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <div className="mx-auto min-h-screen w-full max-w-[390px] bg-white">

        {/* ヘッダー */}
        <header className="sticky top-0 z-30 flex h-[44px] items-center justify-center border-b border-gray-100 bg-white">
          {step === 1 ? (
            <Link
              href={`/events/${eventId}`}
              className="absolute left-2 flex h-8 w-8 items-center justify-center text-gray-700 active:bg-gray-50"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="absolute left-2 flex h-8 w-8 items-center justify-center text-gray-700 active:bg-gray-50"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
          )}
          <h1 className="text-[12px] font-bold tracking-wide text-gray-900">現地レポを投稿</h1>
        </header>

        <StepIndicator step={step} />

        {/* Step 1：座席情報 */}
        {step === 1 && (
          <main className="space-y-3 px-3 pb-8 pt-1">

            {/* 公演情報（読み取り専用） */}
            {(eventDate || eventVenue) && (
              <div className="rounded-xl border border-[#FF6B9D]/20 bg-[#FFF1F6] px-3 py-2.5">
                <p className="text-[11px] font-bold text-[#FF6B9D]">
                  {fmtDate(eventDate)}{eventVenue ? `　${eventVenue}` : ""}
                </p>
              </div>
            )}

            {/* 座席エリア + 席情報 */}
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <h2 className="text-[13px] font-bold text-gray-900">どの席から見たレポですか？</h2>
              <p className="mb-3 mt-0.5 text-[9px] text-gray-400">座席エリアを選んでから詳細を入力してください。</p>

              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-bold text-gray-700">
                    座席エリア<span className="ml-1 text-[#FF6B9D]">必須</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {SEAT_AREA_OPTIONS.slice(0, 3).map((o) => (
                      <Btn
                        key={o.value}
                        selected={seatArea === o.value}
                        onClick={() => { setSeatArea(seatArea === o.value ? "" : o.value); setBlockInfo(""); }}
                      >
                        {o.label}
                      </Btn>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {SEAT_AREA_OPTIONS.slice(3).map((o) => (
                      <Btn
                        key={o.value}
                        selected={seatArea === o.value}
                        onClick={() => { setSeatArea(seatArea === o.value ? "" : o.value); setBlockInfo(""); }}
                      >
                        {o.label}
                      </Btn>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">
                      ブロック<span className="ml-0.5 text-[#FF6B9D]">必須</span>
                    </span>
                    <input
                      type="text"
                      value={blockInfo}
                      onChange={(e) => setBlockInfo(e.target.value)}
                      placeholder="例：A10 / 1塁側 / 下手側"
                      className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">列</span>
                    <input
                      type="text"
                      value={seatRow}
                      onChange={(e) => setSeatRow(e.target.value)}
                      placeholder="例：5列 / C列"
                      className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[64px] shrink-0 text-[10px] font-bold text-gray-700">席番号</span>
                    <input
                      type="text"
                      value={seatNumber}
                      onChange={(e) => setSeatNumber(e.target.value)}
                      placeholder="例：12番"
                      className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-gray-400">大まかで構いません。写真があれば位置が伝わりやすいです。</p>
              </div>
            </section>

            {/* 写真 */}
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <div className="mb-1 flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-gray-900">ステージが見える写真</p>
                <span className="text-[9px] text-gray-400">任意</span>
              </div>
              <p className="mb-3 text-[9px] text-gray-400">席から見た実際の風景を優先してください。スマホの写真でOKです。</p>
              <PhotoUpload
                files={seatViewFiles}
                previews={seatViewPreviews}
                onChange={(f, p) => { setSeatViewFiles(f); setSeatViewPreviews(p); }}
              />
            </section>

            {/* メモ */}
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <div className="mb-1 flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-gray-900">見え方の感想・補足</p>
                <span className="text-[9px] text-gray-400">任意</span>
              </div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value.slice(0, 300))}
                className="mt-2 h-[100px] w-full resize-none rounded-lg border border-gray-200 bg-white px-2 py-2 text-[10px] leading-5 outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                placeholder="例：前の方だったので表情までよく見えました。少し端でしたが全体はしっかり見えました。"
              />
              <div className="mt-1 text-right text-[9px] text-gray-400">{memo.length} / 300</div>
            </section>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => { if (step1CanProceed) setStep(2); }}
                disabled={!step1CanProceed}
                className={`flex h-12 w-full items-center justify-center rounded-full text-[13px] font-bold text-white transition-opacity ${
                  step1CanProceed
                    ? "bg-[#FF6B9D] shadow-[0_8px_20px_rgba(255,107,157,0.25)] active:opacity-80"
                    : "cursor-not-allowed bg-[#FF6B9D]/40"
                }`}
              >
                次へ進む
              </button>
            </div>
          </main>
        )}

        {/* Step 2：見え方チェック */}
        {step === 2 && (
          <main className="space-y-3 px-3 pb-8 pt-1">
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <h2 className="text-[13px] font-bold text-gray-900">見え方チェック</h2>
              <p className="mb-4 mt-0.5 text-[9px] text-gray-400">見え方を教えてください</p>

              <div className="space-y-4">
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
                        selected={ginte === v}
                        onClick={() => setGinte(ginte === v ? "" : v)}
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
              <div className="rounded-xl bg-red-50 px-4 py-3 text-[12px] text-red-600">{error}</div>
            )}

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex h-12 w-full items-center justify-center rounded-full bg-[#FF6B9D] text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,107,157,0.25)] transition-opacity active:opacity-80 disabled:opacity-60"
              >
                {submitting ? "投稿中..." : "投稿する"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex h-10 w-full items-center justify-center rounded-full border border-gray-200 bg-white text-[12px] font-bold text-gray-500 transition-opacity active:opacity-70"
              >
                戻る
              </button>
            </div>
          </main>
        )}

        <BottomNav active="after-report" artistSlug={artistSlug} eventId={eventId} />
      </div>
    </div>
  );
}
