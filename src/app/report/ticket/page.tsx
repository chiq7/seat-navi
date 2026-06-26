"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
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

function normalizeBlock(v: string): string {
  let s = v;
  s = s.replace(/[Ａ-Ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/[ａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/[a-z]/g, (c) => c.toUpperCase());
  s = s.replace(/\s+/g, "");
  return s;
}

function StepIndicator({ step }: { step: number }) {
  const steps = [
    { num: 1, label: "結果" },
    { num: 2, label: "詳細" },
    { num: 3, label: "任意" },
    { num: 4, label: "完了" },
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

function Row({
  label,
  align = "center",
  children,
}: {
  label: string;
  align?: "center" | "start";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-[76px_1fr] gap-2 ${
        align === "start" ? "items-start" : "items-center"
      }`}
    >
      <p className="text-[11px] font-bold leading-snug text-gray-900">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function SeatInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[56px] shrink-0 text-[10px] font-bold text-gray-700">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-[36px] flex-1 rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
      />
    </div>
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
        <h1 className="text-[12px] font-bold tracking-wide text-gray-900">
          当落・座席を報告
        </h1>
      </header>
      <div className="relative z-10 bg-white/80 backdrop-blur-sm">
        <StepIndicator step={4} />
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full rounded-3xl bg-white px-6 pb-8 pt-6 text-center shadow-[0_8px_40px_rgba(17,24,39,0.10)]">
          <div className="mb-4 flex justify-center">
            <Image
              src="/images/report/success/report-success-ticket-icon.png"
              alt=""
              width={140}
              height={140}
              className="object-contain"
            />
          </div>
          <p className="text-[18px] font-bold text-[#111827]">
            報告ありがとうございます！
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280]">
            あなたの報告を受け付けました。
            <br />
            みんなのレポが、次の参戦の参考になります♪
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={onRepeat}
              className="flex h-[52px] w-full items-center justify-center rounded-full bg-[#FF6B9D] text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(255,107,157,0.35)] transition-opacity active:opacity-80"
            >
              同じ内容を引き継いでもう1件報告する
            </button>
            <button
              type="button"
              onClick={onOther}
              className="flex h-[48px] w-full items-center justify-center rounded-full border-2 border-[#FF6B9D] bg-white text-[14px] font-bold text-[#FF6B9D] transition-opacity active:opacity-80"
            >
              別の公演を報告する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketReportPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("tokyo-0712");
  const [result, setResult] = useState("");
  const [lotteryType, setLotteryType] = useState("");
  const [ticketType, setTicketType] = useState("");
  const [ticketCount, setTicketCount] = useState("");
  const [seatArea, setSeatArea] = useState("");
  // アリーナ用
  const [block, setBlock] = useState("");
  const [row, setRow] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  // スタンド用
  const [standDirection, setStandDirection] = useState("");
  const [standDirectionOther, setStandDirectionOther] = useState("");
  const [standFloor, setStandFloor] = useState("");
  const [standFloorOther, setStandFloorOther] = useState("");
  // その他用
  const [otherSeatInfo, setOtherSeatInfo] = useState("");
  // 共通
  const [upgradeStatus, setUpgradeStatus] = useState("");
  const [fcHistory, setFcHistory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [comment, setComment] = useState("");
  const currentVenueType = EVENTS.find((e) => e.id === selectedEvent)?.venueType ?? "arena_dome_stadium";
  const seatAreaOptions = SEAT_AREAS[currentVenueType];

  const step2CanProceed = (() => {
    if (!lotteryType || !ticketType || !ticketCount) return false;
    if (result === "当選した") {
      if (!seatArea || !upgradeStatus) return false;
      if (seatArea === "アリーナ" && (!block || !row || !seatNumber)) return false;
      if (seatArea === "スタンド" && (!standDirection || !row || !seatNumber)) return false;
      if (seatArea === "その他" && (!otherSeatInfo || !row || !seatNumber)) return false;
    }
    return true;
  })();

  const handleStep2Next = () => {
    if (!step2CanProceed) return;
    setStep(3);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans">
        <div className="mx-auto min-h-screen w-full max-w-[390px]">
          <SuccessScreen
            onRepeat={() => {
              setResult("");
              setUpgradeStatus("");
              setBlock("");
              setRow("");
              setSeatNumber("");
              setStandDirection("");
              setStandDirectionOther("");
              setStandFloor("");
              setStandFloorOther("");
              setOtherSeatInfo("");
              setComment("");
              setStep(1);
              setSubmitted(false);
            }}
            onOther={() => {
              setSelectedEvent("tokyo-0712");
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
          <h1 className="text-[12px] font-bold tracking-wide text-gray-900">
            当落・座席を報告
          </h1>
        </header>

        {/* ステップインジケーター */}
        <StepIndicator step={step} />

        {/* Step 1：当落確認 */}
        {step === 1 && (
          <main className="space-y-3 px-3 pb-8 pt-1">
            {/* 報告する公演 */}
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
                          if (seatArea !== "" && !areas.includes(seatArea)) setSeatArea("");
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
                        <div className="text-[12px] font-bold text-gray-900">
                          {event.date}
                        </div>
                        <div className="mt-1 text-[10px] font-semibold text-gray-800">
                          {event.venue}
                        </div>
                        <div
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] font-bold ${
                            isSelected
                              ? "bg-[#FF6B9D] text-white"
                              : "bg-gray-100 text-gray-500"
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

            {/* 今回の結果 */}
            <div>
              <h2 className="mb-3 text-center text-[15px] font-bold text-gray-900">
                今回の結果を教えてください
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setResult("当選した"); setStep(2); }}
                  className={`overflow-hidden rounded-2xl transition-all ${
                    result === "当選した"
                      ? "ring-2 ring-[#FF6B9D] ring-offset-1"
                      : "opacity-80"
                  }`}
                >
                  <Image
                    src="/images/report/ticket/report-ticket-win-icon1.png"
                    alt="当選"
                    width={268}
                    height={268}
                    className="w-full scale-[1.25]"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => { setResult("落選した"); setStep(2); }}
                  className={`overflow-hidden rounded-2xl transition-all ${
                    result === "落選した"
                      ? "ring-2 ring-[#FF6B9D] ring-offset-1"
                      : "opacity-80"
                  }`}
                >
                  <Image
                    src="/images/report/ticket/report-ticket-lose-icon.png"
                    alt="落選"
                    width={268}
                    height={268}
                    className="w-full scale-[1.25]"
                  />
                </button>
              </div>

            </div>
          </main>
        )}

        {/* Step 2：必須情報 */}
        {step === 2 && (
          <main className="space-y-3 px-3 pb-8 pt-1">
            {/* 共通項目 */}
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <h2 className="text-[13px] font-bold text-gray-900">必須情報</h2>
              <p className="mb-3 mt-0.5 text-[9px] text-gray-400">報告に必要な項目です</p>
              <div className="space-y-3">
                {/* 抽選種別 */}
                <Row label="抽選種別">
                  <div className="grid grid-cols-3 gap-2">
                    {["FC1次", "FC2次", "その他"].map((v) => (
                      <Btn key={v} selected={lotteryType === v} onClick={() => setLotteryType(v)}>
                        {v}
                      </Btn>
                    ))}
                  </div>
                </Row>

                {/* 申込席種 */}
                <Row label="申込席種" align="start">
                  <div>
                    <div className="grid grid-cols-2 gap-2">
                      {["通常", "条件付き"].map((v) => (
                        <Btn key={v} selected={ticketType === v} onClick={() => setTicketType(v)}>
                          {v}
                        </Btn>
                      ))}
                    </div>
                    <p className="mt-1 text-[9px] text-gray-400">
                      注釈付き・見切れ・着席指定は「条件付き」
                    </p>
                  </div>
                </Row>

                {/* 申込枚数 */}
                <Row label="申込枚数">
                  <div className="grid grid-cols-4 gap-1.5">
                    {["1枚", "2枚", "3枚", "4枚"].map((v) => (
                      <Btn key={v} selected={ticketCount === v} onClick={() => setTicketCount(v)} xs>
                        {v}
                      </Btn>
                    ))}
                  </div>
                </Row>
              </div>
            </section>

            {/* 当選者のみ：座席情報 */}
            {result === "当選した" && (
              <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
                <h2 className="text-[13px] font-bold text-[#FF4F8B]">座席情報</h2>
                <div className="mb-3 mt-0.5 h-px bg-gray-100" />
                <div className="space-y-3">

                  {/* 座席エリア */}
                  <Row label="座席エリア" align="start">
                    <div className="grid grid-cols-3 gap-2">
                      {seatAreaOptions.map((v) => (
                        <Btn
                          key={v}
                          selected={seatArea === v}
                          onClick={() => {
                            if (v !== "アリーナ" && upgradeStatus === "当選") setUpgradeStatus("");
                            setSeatArea(v);
                          }}
                        >
                          {v}
                        </Btn>
                      ))}
                    </div>
                  </Row>

                  {/* アプグレ応募状況 */}
                  <Row label="アプグレ応募状況" align="start">
                    <div>
                      <div className={`grid gap-2 ${seatArea === "アリーナ" ? "grid-cols-3" : "grid-cols-2"}`}>
                        {(seatArea === "アリーナ" ? ["応募なし", "当選", "落選"] : ["応募なし", "落選"]).map((v) => (
                          <Btn
                            key={v}
                            selected={upgradeStatus === v}
                            onClick={() => setUpgradeStatus(v)}
                            xs
                          >
                            {v}
                          </Btn>
                        ))}
                      </div>
                    </div>
                  </Row>

                  {/* アリーナ：ブロック / 列 / 席番号 */}
                  {seatArea === "アリーナ" && (
                    <Row label="座席詳細" align="start">
                      <div className="space-y-1.5">
                        <SeatInput
                          label="ブロック"
                          value={block}
                          onChange={(v) => setBlock(normalizeBlock(v))}
                          placeholder="例：D2 / A10 / センターA"
                          required
                        />
                        <SeatInput
                          label="列"
                          value={row}
                          onChange={setRow}
                          placeholder="例：3列 / C列"
                          required
                        />
                        <SeatInput
                          label="席番号"
                          value={seatNumber}
                          onChange={setSeatNumber}
                          placeholder="例：1番"
                          required
                        />
                      </div>
                    </Row>
                  )}

                  {/* スタンド：席種・方向 / 列 / 席番号 */}
                  {seatArea === "スタンド" && (
                    <Row label="座席詳細" align="start">
                      <div className="space-y-1.5">
                        <div>
                          <span className="mb-1 block text-[9px] font-bold text-gray-700">
                            席種・方向
                          </span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {STAND_DIRECTIONS.map((v) => (
                              <Btn
                                key={v}
                                selected={standDirection === v}
                                onClick={() => setStandDirection(standDirection === v ? "" : v)}
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
                              placeholder="例：西スタンド / 200レベル / バックネット側 / 内野"
                              className="mt-1.5 h-[42px] w-full rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                            />
                          )}
                        </div>
                        {/* 階層（任意） */}
                        <div>
                          <span className="mb-1 block text-[9px] font-bold text-gray-700">
                            階層（任意）
                          </span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {["1階", "2階", "3階以上", "その他"].map((v) => (
                              <Btn
                                key={v}
                                selected={standFloor === v}
                                onClick={() => setStandFloor(standFloor === v ? "" : v)}
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
                              className="mt-1.5 h-[42px] w-full rounded-lg border border-gray-200 bg-white px-3 text-[10px] outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                            />
                          )}
                        </div>
                        <SeatInput
                          label="列"
                          value={row}
                          onChange={setRow}
                          placeholder="例：15列 / C列"
                          required
                        />
                        <SeatInput
                          label="席番号"
                          value={seatNumber}
                          onChange={setSeatNumber}
                          placeholder="例：34番"
                          required
                        />
                      </div>
                    </Row>
                  )}

                  {/* その他：席種・整理情報 / 列・番号 */}
                  {seatArea === "その他" && (
                    <Row label="座席詳細" align="start">
                      <div className="space-y-1.5">
                        <SeatInput
                          label="席種"
                          value={otherSeatInfo}
                          onChange={setOtherSeatInfo}
                          placeholder="例：立見 / 整理番号A / 特殊席"
                          required
                        />
                        <SeatInput
                          label="列"
                          value={row}
                          onChange={setRow}
                          placeholder="例：10列 / C列"
                          required
                        />
                        <SeatInput
                          label="席番号"
                          value={seatNumber}
                          onChange={setSeatNumber}
                          placeholder="例：25番 / 整理番号150番"
                          required
                        />
                      </div>
                    </Row>
                  )}

                </div>
              </section>
            )}

            {/* ボタン */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleStep2Next}
                disabled={!step2CanProceed}
                className={`flex h-12 w-full items-center justify-center rounded-full text-[13px] font-bold text-white transition-opacity ${
                  step2CanProceed
                    ? "bg-[#FF6B9D] shadow-[0_8px_20px_rgba(255,107,157,0.25)] active:opacity-80"
                    : "bg-[#FF6B9D]/40 cursor-not-allowed"
                }`}
              >
                次へ進む
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

        {/* Step 3：任意・コメント */}
        {step === 3 && (
          <main className="space-y-3 px-3 pb-8 pt-1">
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <h2 className="text-[13px] font-bold text-gray-900">任意で詳しく</h2>
              <p className="mb-3 mt-0.5 text-[9px] text-gray-400">入力は任意です</p>
              <div className="space-y-3">
                {/* FC歴 */}
                <Row label="FC歴">
                  <div className="grid grid-cols-4 gap-1.5">
                    {["未加入", "1年未満", "1〜3年", "3年以上"].map((v) => (
                      <Btn
                        key={v}
                        selected={fcHistory === v}
                        onClick={() => setFcHistory(fcHistory === v ? "" : v)}
                        xs
                      >
                        {v}
                      </Btn>
                    ))}
                  </div>
                </Row>

                {/* 支払い方法 */}
                <Row label="支払い方法">
                  <div className="grid grid-cols-2 gap-2">
                    {["クレカ", "その他"].map((v) => (
                      <Btn
                        key={v}
                        selected={paymentMethod === v}
                        onClick={() => setPaymentMethod(paymentMethod === v ? "" : v)}
                      >
                        {v}
                      </Btn>
                    ))}
                  </div>
                </Row>
              </div>
            </section>

            {/* ひとことコメント */}
            <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
              <div className="mb-1 flex items-center gap-1.5">
                <p className="text-[13px] font-bold text-gray-900">ひとことコメント</p>
                <span className="text-[9px] text-gray-400">任意</span>
              </div>
              <p className="text-[9px] text-gray-400">
                投稿後、アーティストページの速報に表示されることがあります。
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 200))}
                className="mt-2 h-[92px] w-full resize-none rounded-lg border border-gray-200 bg-white px-2 py-2 text-[10px] leading-5 outline-none placeholder:text-gray-300 focus:border-[#FF6B9D]"
                placeholder={`例：FC2次で当選しました！\n例：FC1次は落選、FC2次で当選しました\n例：条件付きで当選しました\n例：アプグレ落選でした`}
              />
              <div className="mt-1 text-right text-[9px] text-gray-400">
                {comment.length} / 200
              </div>
            </section>

            {/* ボタン */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="flex h-12 w-full items-center justify-center rounded-full bg-[#FF6B9D] text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,107,157,0.25)] transition-opacity active:opacity-80"
              >
                報告を送信する
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
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
