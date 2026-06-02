"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import type { Artist } from "@/lib/artists";
import type { AfterReportCard } from "@/lib/artistPageTypes";
import { type TriState, SELECTED_STYLE, Label, Card, TriToggle, PhotoUpload } from "@/components/after-report/AfterReportFormParts";
import { LatestAfterReportsSection } from "@/components/after-report/LatestAfterReportsSection";
import { AfterReportBottomNav } from "@/components/after-report/AfterReportBottomNav";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

const INPUT_CLS =
  "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none accent-focus";

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

      <LatestAfterReportsSection
        reports={afterReports}
        loading={reportsLoading}
        eventDate={eventDate}
        eventVenue={eventVenue}
      />

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

      <AfterReportBottomNav artist={artist} eventId={eventId} />
    </div>
  );
}
