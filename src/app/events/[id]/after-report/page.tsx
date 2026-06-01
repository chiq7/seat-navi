"use client";

import { useState, use, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import type { Artist } from "@/lib/artists";

type AfterReportCard = {
  id: string;
  event_id: string;
  seat_area_type: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_view_photo_paths: string[] | null;
  torokko: string | null;
  kyakukudari: string | null;
  fansa: boolean | null;
  memo: string | null;
  created_at: string;
};

function photoUrl(path: string): string {
  return supabase.storage.from("after-report-photos").getPublicUrl(path).data.publicUrl;
}

function seatAreaLabel(type: string | null): string {
  const map: Record<string, string> = {
    arena: "アリーナ",
    stand_1f: "1階スタンド",
    stand_2f: "2階スタンド",
    stand_3f_or_higher: "3階以上",
    other_unknown: "その他",
  };
  return type ? (map[type] ?? type) : "不明";
}

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

type TriState = "yes" | "no" | "unknown";

const SELECTED_STYLE: React.CSSProperties = {
  backgroundColor: "#5B2BE0",
  borderColor: "#5B2BE0",
  color: "#fff",
};

const INPUT_CLS =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none accent-focus";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-3.5 shadow-sm">{children}</div>;
}

function TriToggle({
  value,
  onChange,
}: {
  value: TriState | "";
  onChange: (v: TriState) => void;
}) {
  const opts: { value: TriState; label: string }[] = [
    { value: "yes",     label: "あり" },
    { value: "no",      label: "なし" },
    { value: "unknown", label: "不明" },
  ];
  return (
    <div className="flex gap-2">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className="flex-1 rounded-xl border py-2 text-xs font-semibold transition-all"
          style={value === o.value
            ? SELECTED_STYLE
            : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#4b5563" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PhotoUpload({
  files,
  previews,
  onChange,
  max = 4,
}: {
  files: File[];
  previews: string[];
  onChange: (files: File[], previews: string[]) => void;
  max?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    const toAdd = incoming.slice(0, max - files.length);
    onChange(
      [...files, ...toAdd],
      [...previews, ...toAdd.map((f) => URL.createObjectURL(f))],
    );
    e.target.value = "";
  }

  function handleRemove(idx: number) {
    URL.revokeObjectURL(previews[idx]);
    onChange(
      files.filter((_, i) => i !== idx),
      previews.filter((_, i) => i !== idx),
    );
  }

  return (
    <>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />
      {previews.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-24 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
          {previews.length < max && (
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-2xl text-gray-300"
            >
              ＋
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-gray-200 py-5 text-gray-400 transition hover:border-gray-400"
        >
          <span className="text-2xl">📷</span>
          <span className="text-xs">写真を追加</span>
        </button>
      )}
    </>
  );
}

const BUCKET = "after-report-photos";

const BLOCK_PREFIXES = ["A", "B", "C", "D", "E", "SS", "SA", "SB", "SC", "SD", "SE"];

const SEAT_AREA_OPTIONS = [
  { value: "arena",              label: "アリーナ" },
  { value: "stand_1f",           label: "1階" },
  { value: "stand_2f",           label: "2階" },
  { value: "stand_3f_or_higher", label: "3階" },
  { value: "other_unknown",      label: "その他/不明" },
] as const;

export default function AfterReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();

  // アーティスト・イベント情報
  const [artist, setArtist] = useState<Artist | null>(null);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [eventVenue, setEventVenue] = useState<string | null>(null);

  // 現地レポ一覧
  const [afterReports, setAfterReports] = useState<AfterReportCard[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from("events")
        .select("title, date, venue")
        .eq("id", eventId)
        .single(),
      supabase
        .from("after_reports")
        .select("id, event_id, seat_area_type, seat_block, seat_row, seat_view_photo_paths, torokko, kyakukudari, fansa, memo, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
    ]).then(([evRes, arRes]) => {
      if (evRes.data) {
        setArtist(findArtistByKeyword(evRes.data.title) ?? null);
        setEventDate(evRes.data.date ?? null);
        setEventVenue(evRes.data.venue ?? null);
      }
      setAfterReports((arRes.data as AfterReportCard[]) ?? []);
      setReportsLoading(false);
    });
  }, [eventId]);

  // 席情報
  const [seatAreaType, setSeatAreaType] = useState("");
  const [blockSelect,  setBlockSelect]  = useState("");
  const [blockNum,     setBlockNum]     = useState("");
  const [blockFree,    setBlockFree]    = useState("");
  const [seatRow,      setSeatRow]      = useState("");
  const [seatNumber,   setSeatNumber]   = useState("");

  const seatBlock =
    blockSelect === "other"
      ? blockFree.trim()
      : blockSelect
        ? (blockSelect + blockNum.trim()).trim()
        : "";

  // 席写真
  const [seatViewFiles,    setSeatViewFiles]    = useState<File[]>([]);
  const [seatViewPreviews, setSeatViewPreviews] = useState<string[]>([]);

  // センターステージ
  const [centerStage, setCenterStage] = useState<TriState | "">("");

  // トロッコ
  const [torokko,         setTorokko]        = useState<TriState | "">("");
  const [torokkoRoute,    setTorokkoRoute]    = useState("");
  const [torokkoFiles,    setTorokkoFiles]    = useState<File[]>([]);
  const [torokkoPreviews, setTorokkoPreviews] = useState<string[]>([]);

  // 客降り
  const [kyakukudari,         setKyakukudari]         = useState<TriState | "">("");
  const [kyakukudariRoute,    setKyakukudariRoute]    = useState("");
  const [kyakukudariFiles,    setKyakukudariFiles]    = useState<File[]>([]);
  const [kyakukudariPreviews, setKyakukudariPreviews] = useState<string[]>([]);

  // その他
  const [fansa,      setFansa]      = useState<boolean | null>(null);
  const [silverTape, setSilverTape] = useState("");
  const [memo,       setMemo]       = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  function clearPhotos(
    setFiles: React.Dispatch<React.SetStateAction<File[]>>,
    setPreviews: React.Dispatch<React.SetStateAction<string[]>>,
    currentPreviews: string[],
  ) {
    currentPreviews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
  }

  async function uploadFiles(files: File[], prefix: string): Promise<string[]> {
    const paths: string[] = [];
    for (const file of files) {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${eventId}/${prefix}/${randomId()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) throw new Error(upErr.message);
      paths.push(path);
    }
    return paths;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!seatAreaType) {
      setError("席種・エリアを選択してください。");
      return;
    }
    if (!blockSelect) {
      setError("ブロック・エリアを入力してください。");
      return;
    }
    if (blockSelect === "other" && !blockFree.trim()) {
      setError("ブロック・エリアを入力してください。");
      return;
    }

    if (
      !seatViewFiles.length && !torokko && !centerStage &&
      !kyakukudari && fansa === null && !silverTape && !memo
    ) {
      setError("少なくとも1項目を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const [seatViewPaths, trokkoPaths, kyakuPaths] = await Promise.all([
        uploadFiles(seatViewFiles, "seat_view"),
        torokko     === "yes" ? uploadFiles(torokkoFiles,     "trolley")       : Promise.resolve<string[]>([]),
        kyakukudari === "yes" ? uploadFiles(kyakukudariFiles, "audience_walk") : Promise.resolve<string[]>([]),
      ]);

      const row = {
        id:                        randomId(),
        event_id:                  eventId,
        seat_area_type:            seatAreaType,
        seat_block:                seatBlock.trim(),
        seat_row:                  seatRow.trim()    || null,
        seat_number:               seatNumber.trim() || null,
        photo_paths:               [...seatViewPaths, ...trokkoPaths, ...kyakuPaths],
        seat_view_photo_paths:     seatViewPaths,
        trolley_photo_paths:       trokkoPaths,
        audience_walk_photo_paths: kyakuPaths,
        center_stage:              centerStage  || null,
        torokko:                   torokko      || null,
        torokko_route:             torokko      === "yes" ? torokkoRoute     || null : null,
        kyakukudari:               kyakukudari  || null,
        kyakukudari_route:         kyakukudari  === "yes" ? kyakukudariRoute || null : null,
        silver_tape_rows:          silverTape ? parseInt(silverTape, 10) : null,
        fansa,
        memo: memo || null,
      };

      const { error: dbErr } = await supabase.from("after_reports").insert(row);
      if (dbErr) throw new Error(dbErr.message);

      router.push(`/events/${eventId}?after_reported=1`);
    } catch (err) {
      setError("投稿に失敗しました: " + (err instanceof Error ? err.message : String(err)));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header
        className="fixed left-1/2 top-0 z-50 flex h-14 w-full max-w-[430px] -translate-x-1/2 items-center justify-between px-4"
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
          <Link
            href={`/events/${eventId}`}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{ background: "rgba(0,104,118,0.06)" }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold tracking-tight" style={{ color: "#006876" }}>
              {artist?.name ?? "現地レポート"}
            </p>
            <p className="text-[10px] text-gray-400">現地レポート</p>
          </div>
          <div className="w-9" />
      </header>

      {/* 最新の現地レポ（横スライド） */}
      <section className="mt-[72px]">
        <div className="mb-3 px-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            最新の現地レポ
          </h2>
        </div>

        {reportsLoading ? (
          <div className="mx-4 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
            <p className="text-xs text-gray-400">読み込み中...</p>
          </div>
        ) : afterReports.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
            {afterReports.map(report => {
              const thumb = report.seat_view_photo_paths?.[0];
              const thumbUrl = thumb ? photoUrl(thumb) : null;
              return (
                <div
                  key={report.id}
                  className="min-w-[260px] snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  <div className="relative aspect-video bg-gray-100">
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {eventDate && (
                      <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                        {eventDate.slice(5).replace("-", "/")} {eventVenue ?? ""}
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {report.torokko === "yes" && (
                        <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">トロッコ</span>
                      )}
                      {report.kyakukudari === "yes" && (
                        <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">客降り</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold" style={{ color: "#006876" }}>
                      {seatAreaLabel(report.seat_area_type)}
                      {report.seat_block ? ` ${report.seat_block}` : ""}
                      {report.seat_row ? ` ${report.seat_row}列` : ""}
                    </p>
                    {report.memo && (
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500">{report.memo}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {report.fansa === true && (
                        <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">ファンサ</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-4 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-400">現地レポートはまだありません</p>
            <p className="mt-2 text-xs text-gray-400">最初のレポートを投稿する ↓</p>
          </div>
        )}
      </section>

      {/* 投稿フォームの見出し */}
      <div className="mx-auto max-w-md px-3 pb-2 pt-5">
        <h2 className="text-sm font-bold text-gray-800">現地レポを投稿する</h2>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-2.5 px-4 pt-2">

        {/* ① あなたの席は？（必須） */}
        <Card>
          <p className="mb-3 text-sm font-bold text-gray-800">
            あなたの席は？<span className="ml-1 text-red-500">*</span>
          </p>

          <div className="mb-3">
            <Label required>席種・エリア</Label>
            <div className="flex flex-wrap gap-1.5">
              {SEAT_AREA_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setSeatAreaType(o.value)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all"
                  style={seatAreaType === o.value
                    ? SELECTED_STYLE
                    : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#4b5563" }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <Label required>ブロック・エリア</Label>
              <select
                value={blockSelect}
                onChange={(e) => {
                  setBlockSelect(e.target.value);
                  setBlockNum("");
                  setBlockFree("");
                }}
                className={INPUT_CLS}
              >
                <option value="">選択してください</option>
                {BLOCK_PREFIXES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="other">その他/選択肢なし</option>
              </select>
              {blockSelect && blockSelect !== "other" && (
                <input
                  type="text"
                  inputMode="numeric"
                  value={blockNum}
                  onChange={(e) => setBlockNum(e.target.value)}
                  placeholder="番号（例: 3）"
                  className={`mt-2 ${INPUT_CLS}`}
                />
              )}
              {blockSelect === "other" && (
                <input
                  type="text"
                  value={blockFree}
                  onChange={(e) => setBlockFree(e.target.value)}
                  placeholder="例：B3 / 1塁側 / 3階中央 / 注釈席"
                  className={`mt-2 ${INPUT_CLS}`}
                />
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={seatRow}
                onChange={(e) => setSeatRow(e.target.value)}
                placeholder="列（例: 5）"
                className={INPUT_CLS}
              />
              <input
                type="text"
                inputMode="numeric"
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                placeholder="座席番号（例: 12）"
                className={INPUT_CLS}
              />
            </div>
          </div>
        </Card>

        {/* ② 席写真 */}
        <Card>
          <p className="mb-1 text-xs font-bold text-gray-700">
            あなたの席からの写真
            <span className="ml-1.5 text-[10px] font-normal text-gray-400">（任意）</span>
          </p>
          <p className="mb-2.5 text-[11px] text-gray-500">
            席からの見え方が分かる写真があれば追加してください。
          </p>
          <PhotoUpload
            files={seatViewFiles}
            previews={seatViewPreviews}
            onChange={(f, p) => { setSeatViewFiles(f); setSeatViewPreviews(p); }}
          />
          <p className="mt-1.5 text-[10px] text-gray-400">
            ※顔・座席番号・チケット情報は隠してください。
          </p>
        </Card>

        {/* ③ 会場演出 */}
        <Card>
          <p className="mb-3 text-xs font-bold text-gray-400">会場演出</p>
          <div className="space-y-3">

            <div>
              <Label>センターステージ</Label>
              <TriToggle value={centerStage} onChange={setCenterStage} />
            </div>

            <div>
              <Label>トロッコ</Label>
              <TriToggle
                value={torokko}
                onChange={(v) => {
                  setTorokko(v);
                  if (v !== "yes") {
                    setTorokkoRoute("");
                    clearPhotos(setTorokkoFiles, setTorokkoPreviews, torokkoPreviews);
                  }
                }}
              />
              {torokko === "yes" && (
                <div className="mt-3 space-y-2.5">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold text-gray-600">トロッコの写真・ルート図（任意）</p>
                    <p className="mb-2 text-[11px] text-gray-500">
                      トロッコが通った場所が分かる写真・図・メモがあれば追加してください。
                    </p>
                    <PhotoUpload
                      files={torokkoFiles}
                      previews={torokkoPreviews}
                      onChange={(f, p) => { setTorokkoFiles(f); setTorokkoPreviews(p); }}
                    />
                  </div>
                  <input
                    type="text"
                    value={torokkoRoute}
                    onChange={(e) => setTorokkoRoute(e.target.value)}
                    placeholder="例：アリーナ外周を時計回り / Bブロック前を通過 / スタンド前を通った など"
                    className={INPUT_CLS}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>客降り</Label>
              <TriToggle
                value={kyakukudari}
                onChange={(v) => {
                  setKyakukudari(v);
                  if (v !== "yes") {
                    setKyakukudariRoute("");
                    clearPhotos(setKyakukudariFiles, setKyakukudariPreviews, kyakukudariPreviews);
                  }
                }}
              />
              {kyakukudari === "yes" && (
                <div className="mt-3 space-y-2.5">
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold text-gray-600">客降りの写真・ルートメモ（任意）</p>
                    <p className="mb-2 text-[11px] text-gray-500">
                      メンバーが来た通路やブロック付近が分かる写真・メモがあれば追加してください。
                    </p>
                    <PhotoUpload
                      files={kyakukudariFiles}
                      previews={kyakukudariPreviews}
                      onChange={(f, p) => { setKyakukudariFiles(f); setKyakukudariPreviews(p); }}
                    />
                  </div>
                  <input
                    type="text"
                    value={kyakukudariRoute}
                    onChange={(e) => setKyakukudariRoute(e.target.value)}
                    placeholder="例：1塁側スタンド前 / アリーナCブロック横の通路 / 下手側通路に来た など"
                    className={INPUT_CLS}
                  />
                </div>
              )}
            </div>

          </div>
        </Card>

        {/* ④ ファンサ */}
        <Card>
          <Label>ファンサもらえた？</Label>
          <div className="flex gap-2">
            {([true, false] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setFansa(fansa === v ? null : v)}
                className="flex-1 rounded-xl border py-2 text-sm font-semibold transition-all"
                style={fansa === v
                  ? SELECTED_STYLE
                  : { borderColor: "#e5e7eb", backgroundColor: "#fff", color: "#4b5563" }}
              >
                {v ? "もらえた！" : "なかった"}
              </button>
            ))}
          </div>
        </Card>

        {/* ⑤ 銀テープ */}
        <Card>
          <Label>銀テープ飛距離（何列目まで飛んできた？）</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={silverTape}
              onChange={(e) => setSilverTape(e.target.value)}
              placeholder="例: 10"
              className="w-24 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none accent-focus"
            />
            <span className="text-sm text-gray-500">列目</span>
          </div>
        </Card>

        {/* ⑥ 感想メモ */}
        <Card>
          <Label>感想メモ</Label>
          <textarea
            rows={3}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="公演の感想・気づいたことなど（任意）"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none accent-focus"
          />
        </Card>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          style={{ background: "linear-gradient(90deg, #0B7A88, #5B2BE0)" }}
        >
          {submitting ? "投稿中..." : "現地レポートを投稿する 🎉"}
        </button>

      </form>

      {/* ボトムナビ */}
      <nav
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-100"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          <Link
            href={artist ? `/artists/${artist.slug}` : "#"}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5"
          >
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-400">集計まとめ</span>
          </Link>

          <Link
            href={`/events/${eventId}`}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5"
          >
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-400">座席予想</span>
          </Link>

          <div className="flex flex-col items-center gap-0.5 px-4 py-1.5">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-bold" style={{ color: "#006876" }}>現地レポ</span>
          </div>

          <Link
            href={artist ? `/artists/${artist.slug}/setlist` : "#"}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5"
          >
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-400">セトリ</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
