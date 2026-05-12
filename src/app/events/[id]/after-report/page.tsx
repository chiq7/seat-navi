"use client";

import { useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

type TriState = "yes" | "no" | "unknown";

const BLOCK_OPTIONS = ["A", "B", "C", "D", "E", "SS", "SA", "SB", "SC", "SD", "SE", "花道", "センステ"];

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      {title && <p className="mb-3 text-xs font-bold text-gray-400">{title}</p>}
      {children}
    </div>
  );
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
          className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
            value === o.value
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-gray-200 bg-white text-gray-600 hover:border-[var(--accent)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BlockSelect({
  label,
  selected,
  onChange,
}: {
  label: string;
  selected: string[];
  onChange: (blocks: string[]) => void;
}) {
  const toggle = (b: string) =>
    onChange(selected.includes(b) ? selected.filter((x) => x !== b) : [...selected, b]);
  return (
    <div className="mt-2">
      <p className="mb-1 text-[11px] text-gray-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {BLOCK_OPTIONS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => toggle(b)}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-all ${
              selected.includes(b)
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-gray-200 bg-white text-gray-500 hover:border-[var(--accent)]"
            }`}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}

function StarRow({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition-transform active:scale-90 ${
            n <= value ? "text-yellow-400" : "text-gray-200"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const BUCKET = "after-report-photos";

export default function AfterReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();

  // 写真
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFiles,   setPhotoFiles]   = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // 構造物
  const [hanamichi,        setHanamichi]        = useState<TriState | "">("");
  const [hanamichiBlocks,  setHanamichiBlocks]  = useState<string[]>([]);
  const [torokko,          setTorokko]          = useState<TriState | "">("");
  const [torokkoRoute,     setTorokkoRoute]     = useState("");
  const [centerStage,      setCenterStage]      = useState<TriState | "">("");
  const [centerStagePos,   setCenterStagePos]   = useState("");
  const [kyakukudari,      setKyakukudari]      = useState<TriState | "">("");
  const [kyakukudariBlocks,setKyakukudariBlocks]= useState<string[]>([]);

  // 体験評価
  const [silverTape,   setSilverTape]   = useState("");
  const [visibility,   setVisibility]   = useState(0);
  const [fansa,        setFansa]        = useState<boolean | null>(null);
  const [satisfaction, setSatisfaction] = useState(0);
  const [memo,         setMemo]         = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    setPhotoFiles(files);
    setPhotoPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function removePhoto(idx: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!hanamichi && !torokko && !centerStage && !kyakukudari && !visibility && !satisfaction) {
      setError("少なくとも1項目を入力してください");
      return;
    }

    setSubmitting(true);

    // 写真アップロード
    const photoPaths: string[] = [];
    for (const file of photoFiles) {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${eventId}/${randomId()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) {
        setError("写真のアップロードに失敗しました: " + upErr.message);
        setSubmitting(false);
        return;
      }
      photoPaths.push(path);
    }

    const row = {
      id:                randomId(),
      event_id:          eventId,
      photo_paths:       photoPaths,
      hanamichi:         hanamichi   || null,
      hanamichi_blocks:  hanamichiBlocks,
      torokko:           torokko     || null,
      torokko_route:     torokkoRoute || null,
      center_stage:      centerStage || null,
      center_stage_pos:  centerStagePos || null,
      kyakukudari:       kyakukudari || null,
      kyakukudari_blocks:kyakukudariBlocks,
      silver_tape_rows:  silverTape ? parseInt(silverTape, 10) : null,
      visibility:        visibility  || null,
      fansa:             fansa,
      satisfaction:      satisfaction || null,
      memo:              memo || null,
    };

    const { error: dbErr } = await supabase.from("after_reports").insert(row);
    if (dbErr) {
      setError("投稿に失敗しました: " + dbErr.message);
      setSubmitting(false);
      return;
    }

    router.push(`/events/${eventId}?after_reported=1`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href={`/events/${eventId}`} className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900">答え合わせ</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-3 px-4 pt-5">

        {/* ① 写真投稿 */}
        <Card title="写真（最大4枚）">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {photoPreviews.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-28 w-full rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photoPreviews.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-2xl text-gray-300"
                >
                  ＋
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-8 text-gray-400 transition hover:border-[var(--accent)]"
            >
              <span className="text-3xl">📷</span>
              <span className="text-xs">席からの景色・アリーナ全体図など</span>
            </button>
          )}
        </Card>

        {/* ② 花道 */}
        <Card title="構造物レポート">
          <div className="space-y-4">

            <div>
              <Label>花道</Label>
              <TriToggle value={hanamichi} onChange={setHanamichi} />
              {hanamichi === "yes" && (
                <BlockSelect
                  label="どのブロック付近？（複数可）"
                  selected={hanamichiBlocks}
                  onChange={setHanamichiBlocks}
                />
              )}
            </div>

            <div>
              <Label>トロッコ</Label>
              <TriToggle value={torokko} onChange={setTorokko} />
              {torokko === "yes" && (
                <input
                  type="text"
                  value={torokkoRoute}
                  onChange={(e) => setTorokkoRoute(e.target.value)}
                  placeholder="ルート（例: A→B→C周回）"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              )}
            </div>

            <div>
              <Label>センターステージ</Label>
              <TriToggle value={centerStage} onChange={setCenterStage} />
              {centerStage === "yes" && (
                <input
                  type="text"
                  value={centerStagePos}
                  onChange={(e) => setCenterStagePos(e.target.value)}
                  placeholder="位置（例: アリーナ中央）"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              )}
            </div>

            <div>
              <Label>客降り</Label>
              <TriToggle value={kyakukudari} onChange={setKyakukudari} />
              {kyakukudari === "yes" && (
                <BlockSelect
                  label="どのブロックまで来た？（複数可）"
                  selected={kyakukudariBlocks}
                  onChange={setKyakukudariBlocks}
                />
              )}
            </div>

          </div>
        </Card>

        {/* ③ 体験評価 */}
        <Card title="体験評価">
          <div className="space-y-4">

            <div>
              <Label>銀テープ飛距離（何列目まで飛んできた？）</Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={silverTape}
                  onChange={(e) => setSilverTape(e.target.value)}
                  placeholder="例: 10"
                  className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
                <span className="text-sm text-gray-500">列目</span>
              </div>
            </div>

            <div>
              <Label>視認性（ステージの見やすさ）</Label>
              <StarRow value={visibility} onChange={setVisibility} />
            </div>

            <div>
              <Label>ファンサもらえた？</Label>
              <div className="flex gap-2">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setFansa(fansa === v ? null : v)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${
                      fansa === v
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-[var(--accent)]"
                    }`}
                  >
                    {v ? "もらえた！" : "なかった"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>総合満足度</Label>
              <StarRow value={satisfaction} onChange={setSatisfaction} />
            </div>

            <div>
              <Label>感想メモ</Label>
              <textarea
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="公演の感想・気づいたことなど（任意）"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>

          </div>
        </Card>

        {/* エラー */}
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-[var(--accent)] py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--accent-dark)] active:scale-95 disabled:opacity-60"
        >
          {submitting ? "投稿中..." : "答え合わせを投稿する 🎉"}
        </button>

      </form>
    </div>
  );
}
