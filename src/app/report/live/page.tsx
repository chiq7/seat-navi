"use client";

import { useState } from "react";
import { Camera, ChevronLeft, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type VenueType = "arena_dome_stadium" | "hall_theater" | "livehouse_other";

const SEAT_AREAS: Record<VenueType, string[]> = {
  arena_dome_stadium: ["アリーナ", "スタンド", "その他"],
  hall_theater: ["1階席", "2階席以上", "バルコニー", "その他"],
  livehouse_other: ["指定席", "スタンディング", "整理番号", "その他"],
};

const EVENTS: { id: string; date: string; venue: string; day: string; venueType: VenueType }[] = [
  { id: "tokyo-0712", date: "7/12（土）", venue: "東京ドーム", day: "Day1", venueType: "arena_dome_stadium" },
  { id: "tokyo-0713", date: "7/13（日）", venue: "東京ドーム", day: "Day2", venueType: "arena_dome_stadium" },
  { id: "kyocera-0720", date: "7/20（土）", venue: "京セラドーム", day: "Day1", venueType: "arena_dome_stadium" },
];

const STAND_DIRECTIONS = ["1塁側", "3塁側", "外野", "その他", "北", "南", "西", "東"] as const;
const STAND_FLOORS = ["1階", "2階", "3階以上", "その他"] as const;

type PerfKey = "censtage" | "torocco" | "kyakuori" | "fansa" | "ginte";
type PerfValue = "あり" | "なし" | "わからない" | "1" | "2" | "3" | "4" | "5" | "";

const RATING_ITEMS: { key: Exclude<PerfKey, "ginte">; label: string }[] = [
  { key: "censtage", label: "センステ" },
  { key: "torocco", label: "トロッコ" },
  { key: "kyakuori", label: "客降り" },
  { key: "fansa", label: "ファンサ" },
];

const RATING_OPTIONS = ["なし", "1", "2", "3", "4", "5"] as const;
const GINTE_OPTIONS = ["あり", "なし", "わからない"] as const;

const EMPTY_PERF: Record<PerfKey, PerfValue> = {
  censtage: "",
  torocco: "",
  kyakuori: "",
  fansa: "",
  ginte: "",
};

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
            <span
              className={`mt-0.5 text-[9px] font-semibold ${
                step >= s.num ? "text-[#FF6B9D]" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mb-4 h-[2px] w-8 transition-colors ${
                step > s.num ? "bg-[#FF6B9D]" : "bg-gray-200"
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

function SuccessScreen({
  onRepeat,
  onOther,
}: {
  onRepeat: () => void;
  onOther: () => void;
}) {
  return (
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
        <Link
          href="/report"
          className="absolute left-2 flex h-8 w-8 items-center justify-center text-gray-700"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </Link>
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
              onClick={onRepeat}
              className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#FF6B9D] text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(255,107,157,0.35)] transition-opacity active:opacity-80"
            >
              もう1件投稿する
            </button>
            <button
              type="button"
              onClick={onOther}
              className="flex h-[48px] w-full items-center justify-center rounded-full border-2 border-[#FF6B9D] bg-white text-[14px] font-bold text-[#FF6B9D] transition-opacity active:opacity-80"
            >
              別の公演を投稿する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveReportPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("tokyo-0712");
  const [seatArea, setSeatArea] = useState("");
  const [blockInfo, setBlockInfo] = useState("");
  const [row, setRow] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [standDirection, setStandDirection] = useState("");
  const [standDirectionOther, setStandDirectionOther] = useState("");
  const [standFloor, setStandFloor] = useState("");
  const [standFloorOther, setStandFloorOther] = useState("");
  const [otherSeatInfo, setOtherSeatInfo] = useState("");
  const [photoSelected, setPhotoSelected] = useState(false);
  const [perf, setPerf] = useState<Record<PerfKey, PerfValue>>(EMPTY_PERF);
  const [memo, setMemo] = useState("");

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
    setPhotoSelected(false);
    setPerf(EMPTY_PERF);
    setMemo("");
  };

  const currentVenueType = EVENTS.find((e) => e.id === selectedEvent)?.venueType ?? "arena_dome_stadium";
  const seatAreaOptions = SEAT_AREAS[currentVenueType];

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
  const canSubmit = true;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans">
        <div className="mx-auto min-h-screen w-full max-w-[390px]">
          <SuccessScreen
            onRepeat={() => {
              resetForm();
              setStep(1);
              setSubmitted(false);
            }}
            onOther={() => {
              setSelectedEvent("tokyo-0712");
              resetForm();
              setStep(1);
              setSubmitted(false);
            }}
          />
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
              href="/report"
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

        {/* Step 1：公演・座席・写真 */}
        {step === 1 && (
          <main className="space-y-3 px-3 pb-8 pt-1">
            {/* 公演選択 */}
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <div className="mb-2">
                <h2 className="text-center text-[13px] font-bold text-gray-900">報告する公演</h2>
              </div>
              <div className="-mx-1 overflow-x-auto pb-1 hide-scrollbar">
                <div className="flex min-w-max gap-2 px-1">
                  {EVENTS.map((event) => {
                    const isSelected = selectedEvent === event.id;
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          const newVenueType = event.venueType;
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
                          setSelectedEvent(event.id);
                        }}
                        className={`relative h-[74px] w-[96px] shrink-0 rounded-xl px-2 py-2 text-left transition-colors ${
                          isSelected
                            ? "border-2 border-[#FF6B9D] bg-[#FFF1F6]"
                            : "border border-gray-200 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B9D] text-[9px] text-white">
                            ✓
                          </span>
                        )}
                        <div className="text-[12px] font-bold text-gray-900">{event.date}</div>
                        <div className="mt-1 text-[10px] font-semibold text-gray-800">{event.venue}</div>
                        <div
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold ${
                            isSelected ? "bg-[#FF6B9D] text-white" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {event.day}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 座席情報 */}
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <h2 className="text-[13px] font-bold text-gray-900">どの席から見たレポですか？</h2>
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
                        onChange={(e) => setBlockInfo(e.target.value)}
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
                        onChange={(e) => setRow(e.target.value)}
                        placeholder="例：5列 / C列"
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
                        onChange={(e) => setSeatNumber(e.target.value)}
                        placeholder="例：12番"
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
                        onChange={(e) => setRow(e.target.value)}
                        placeholder="例：15列 / C列"
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
                        onChange={(e) => setSeatNumber(e.target.value)}
                        placeholder="例：25番"
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
                        onChange={(e) => setRow(e.target.value)}
                        placeholder="例：10列 / C列"
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
                        onChange={(e) => setSeatNumber(e.target.value)}
                        placeholder="例：25番"
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
                        onChange={(e) => setBlockInfo(e.target.value)}
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
                        onChange={(e) => setRow(e.target.value)}
                        placeholder="例：5列"
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
                        onChange={(e) => setSeatNumber(e.target.value)}
                        placeholder="例：12番"
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
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <div className="mb-1 flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-gray-900">ステージが見える写真</p>
                <span className="text-[9px] text-gray-400">任意</span>
              </div>
              <p className="mb-3 text-[9px] text-gray-400">
                席から見た実際の風景を優先してください。スマホの写真でOKです。
              </p>
              {photoSelected ? (
                <div className="relative flex h-[120px] items-center justify-center rounded-xl bg-gray-100">
                  <p className="text-[11px] text-gray-500">写真が選択されています</p>
                  <button
                    type="button"
                    onClick={() => setPhotoSelected(false)}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-400 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPhotoSelected(true)}
                  className="flex h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors active:bg-gray-100"
                >
                  <Camera size={24} className="text-gray-300" />
                  <p className="text-[10px] text-gray-400">席からの見え方写真を選ぶ</p>
                </button>
              )}
            </section>

            {/* 見え方の感想・補足（任意） */}
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
              <div className="mt-1 text-right text-[9px] text-gray-400">
                {memo.length} / 300
              </div>
            </section>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => { if (step1CanProceed) setStep(2); }}
                disabled={!step1CanProceed}
                className={`flex h-12 w-full items-center justify-center rounded-full text-[13px] font-bold text-white transition-opacity ${
                  step1CanProceed
                    ? "bg-[#FF6B9D] shadow-[0_8px_20px_rgba(255,107,157,0.25)] active:opacity-80"
                    : "bg-[#FF6B9D]/40 cursor-not-allowed"
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

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="flex h-12 w-full items-center justify-center rounded-full bg-[#FF6B9D] text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,107,157,0.25)] transition-opacity active:opacity-80"
              >
                投稿する
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-gray-200 bg-white text-[12px] font-bold text-gray-500 transition-opacity active:opacity-70"
              >
                戻る
              </button>
            </div>
          </main>
        )}

      </div>
    </div>
  );
}
