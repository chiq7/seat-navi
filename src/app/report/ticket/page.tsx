"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Send, TicketCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { getPostingContext, supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { AccountLink } from "@/components/auth/AccountLink";
import { CompactEventPickerSection } from "@/components/common/CompactEventPickerSection";
import { CompactHeroIntro } from "@/components/common/CompactHeroIntro";
import { ShareButton } from "@/components/common/ShareButton";
import { ProgressSteps } from "@/components/common/ProgressSteps";
import { ReportChoiceButton as Btn } from "@/components/report/ReportChoiceButton";

function toLotteryTypeTicketResults(v: string): string | null {
  if (v === "FC1次") return "1次抽選";
  if (v === "FC2次") return "2次抽選";
  if (v === "その他") return "その他";
  return null;
}

function toLotteryTypeSeatReports(v: string): string {
  if (v === "FC1次") return "fc1";
  if (v === "FC2次") return "fc2";
  return "general";
}

function toFcHistoryTicketResults(v: string): string | null {
  if (v === "1年未満") return "1年未満";
  if (v === "1〜3年") return "1〜3年";
  if (v === "3年以上") return "3年以上";
  return null;
}

function toFcHistorySeatReports(v: string): string | null {
  if (v === "1年未満") return "under_1_year";
  if (v === "1〜3年") return "one_to_three_years";
  if (v === "3年以上") return "over_3_years";
  return null;
}

function toSeatType(ticketTypeVal: string, seatAreaVal: string): string | null {
  if (!ticketTypeVal) return null;
  if (ticketTypeVal === "条件付き") return "restricted";
  if (seatAreaVal === "アリーナ") return "arena";
  if (seatAreaVal === "スタンド") return "stand";
  return "unknown";
}

function toUpgradeResult(upgradeStatusVal: string, isWon: boolean): string {
  if (!isWon) return "not_applied";
  if (upgradeStatusVal === "当選") return "applied_won";
  if (upgradeStatusVal === "落選") return "applied_lost";
  return "not_applied";
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

const STAND_DIRECTIONS = ["1塁側", "3塁側", "外野", "その他", "北", "南", "西", "東"] as const;

function toHalfWidthUpper(v: string): string {
  let s = v;
  s = s.replace(/[Ａ-Ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/[ａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/[a-z]/g, (c) => c.toUpperCase());
  s = s.replace(/\s+/g, "");
  return s;
}

/** 座席系入力の自動整形: 全角→半角・大文字化・末尾の単位(ブロック/列/番)の重複除去 */
function normalizeSeatField(v: string, suffix: string): string {
  const converted = toHalfWidthUpper(v);
  return converted.endsWith(suffix) ? converted.slice(0, -suffix.length) : converted;
}

function normalizeBlock(v: string): string {
  return normalizeSeatField(v, "ブロック");
}

/** 席番号の自動整形: 全角→半角・末尾の「番」除去に加え、数字以外を許可しない */
function normalizeSeatNumber(v: string): string {
  return normalizeSeatField(v, "番").replace(/[^0-9]/g, "");
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
      className={`grid grid-cols-1 gap-2 border-b border-[#ebe7e9] pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[112px_1fr] ${
        align === "start" ? "items-start" : "sm:items-center"
      }`}
    >
      <p className="text-[11px] font-black leading-snug text-[#1c171b]">{label}</p>
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
      <span className="w-[64px] shrink-0 text-[10px] font-black text-[#544e52]">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="zr-focus h-11 min-w-0 flex-1 border border-[#ded8dc] bg-white px-3 text-[12px] font-bold outline-none placeholder:text-[#b5adb2] focus:border-[#f43679]"
      />
    </div>
  );
}

function SuccessScreen({
  onOther,
  artistSlug,
}: {
  onOther: () => void;
  artistSlug: string | null;
}) {
  const shareUrl = typeof window !== "undefined" ? (artistSlug ? `${window.location.origin}/artists/${artistSlug}` : window.location.origin) : "";
  const shareText = "ライブの当落・座席をちけレポに投稿しました！ #ちけレポ";
  const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="community-page flex flex-col">
      <header className="zr-container flex h-16 items-center justify-between">
        <Link
          href="/report"
          className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#2b252b] shadow-sm"
          aria-label="報告画面へ戻る"
        >
          <ChevronLeft size={25} />
        </Link>
        <AccountLink iconSize={22} />
      </header>
      <section className="community-hero pb-11 pt-5">
        <div className="zr-container text-center">
          <p className="community-eyebrow">REPORT COMPLETE</p>
          <h1 className="mt-4 text-[38px] font-black leading-tight tracking-[-0.05em]">投稿できました。</h1>
          <p className="community-subtitle mt-3">あなたの記録が、次に同じ会場へ行く人の助けになります。</p>
        </div>
      </section>
      <div className="zr-container border-b border-[#eadfe4]"><ProgressSteps steps={["結果", "詳細", "任意", "完了"]} currentStep={3} /></div>
      <main className="zr-container flex-1 py-6">
        <section className="community-panel p-5 text-center sm:p-7">
          <div className="flex justify-center">
            <Image
              src="/images/report/success/report-success-ticket-icon.png"
              alt=""
              width={110}
              height={110}
              className="object-contain"
            />
          </div>
          <p className="mt-3 text-[17px] font-black">結果をXで共有しよう</p>
          <p className="mt-2 text-[11px] font-medium leading-5 text-[#817981]">投稿内容の詳細は含めず、ちけレポへの投稿完了をシェアします。</p>
          <div className="mt-6 grid grid-cols-[1fr_52px] gap-2">
            <a href={xShareHref} target="_blank" rel="noopener noreferrer" className="community-primary-button min-h-[52px]">Xで共有する</a>
            <ShareButton url={shareUrl} text={shareText} className="community-secondary-button h-[52px] w-[52px] px-0" />
          </div>
          <div className="mt-7 space-y-2 border-t border-[#ded8dc] pt-6">
            <button
              type="button"
              onClick={onOther}
              className="community-primary-button min-h-[52px] w-full"
            >
              別の当落・座席を報告する
            </button>
            {artistSlug && (
              <Link
                href={`/artists/${artistSlug}`}
                className="community-secondary-button min-h-12 w-full"
              >
                まとめページに戻る
              </Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function TicketReportPage() {
  return (
    <Suspense fallback={null}>
      <TicketReportPageInner />
    </Suspense>
  );
}

function TicketReportPageInner() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState("");
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedArtistSlug, setSubmittedArtistSlug] = useState<string | null>(null);
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

  const selectedVenue = events.find((e) => e.id === selectedEvent)?.venue ?? "";
  const currentVenueType = selectedVenue ? getVenueType(selectedVenue) : "arena_dome_stadium";
  const seatAreaOptions = SEAT_AREAS[currentVenueType];
  const reportEntryHref = selectedEvent ? `/report?event=${selectedEvent}` : "/report";

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

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const { client: postingClient, userId } = await getPostingContext();
      const reportId = crypto.randomUUID();
      const isWon = result === "当選した";
      const resolvedStandDirection = standDirection === "その他" ? standDirectionOther : standDirection;
      const resolvedStandFloor = standFloor === "その他" ? standFloorOther : standFloor;

      const { error: ticketErr } = await postingClient.from("event_ticket_results").insert({
        id:                     reportId,
        user_id:                userId,
        event_id:               selectedEvent,
        result:                 isWon ? "won" : "lost",
        lost_application_count: isWon ? 0 : 1,
        ticket_count:           parseInt(ticketCount, 10) || null,
        lottery_type:           toLotteryTypeTicketResults(lotteryType),
        fc_history:             toFcHistoryTicketResults(fcHistory),
        payment_method:         paymentMethod || null,
        seat_type:              isWon ? toSeatType(ticketType, seatArea) : null,
        upgrade_result:         toUpgradeResult(upgradeStatus, isWon),
        comment:                comment || null,
        seat_block:             block.trim() || null,
        seat_row:               row || null,
        seat_number:            seatNumber || null,
        stand_direction:        resolvedStandDirection || null,
        stand_floor:            resolvedStandFloor || null,
        other_seat_info:        otherSeatInfo || null,
      });
      if (ticketErr) throw new Error(ticketErr.message);

      if (isWon && seatArea === "アリーナ") {
        const rowNum = parseInt(row, 10);
        const seatNum = parseInt(seatNumber, 10);
        if (block.trim() && rowNum >= 1 && seatNum >= 1) {
          const { error: seatErr } = await postingClient.from("seat_reports").insert({
            id:             reportId,
            user_id:        userId,
            event_id:       selectedEvent,
            block:          block.trim(),
            row_num:        rowNum,
            seat_num:       seatNum,
            lottery_type:   toLotteryTypeSeatReports(lotteryType),
            payment_method: paymentMethod || null,
            fc_history:     toFcHistorySeatReports(fcHistory),
            comment:        comment || null,
          });
          if (seatErr) throw new Error(seatErr.message);
        }
      }

      const ev = events.find(e => e.id === selectedEvent);
      setSubmittedArtistSlug(ev ? (resolveArtist(ev)?.slug ?? null) : null);
      trackEvent("report_submit", {
        report_type: "ticket",
        event_id: selectedEvent,
        result: isWon ? "won" : "lost",
        has_comment: Boolean(comment.trim()),
        has_seat: isWon && Boolean(seatArea),
      });
      setSubmitted(true);
    } catch (err) {
      setError("投稿に失敗しました: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="community-page font-sans">
        <div className="min-h-screen w-full">
          <SuccessScreen
            onOther={() => {
              setSelectedEvent(events[0]?.id ?? "");
              setStep(1);
              setSubmitted(false);
            }}
            artistSlug={submittedArtistSlug}
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
        <CompactHeroIntro
          eyebrow="TICKET & SEAT REPORT"
          title="当落と座席を"
          accent="報告する"
          subtitle="抽選結果と座席情報を共有できます。"
          icon={<TicketCheck size={21} strokeWidth={1.8} className="text-[#e94a7d]" />}
        />
      </section>

        {/* ステップインジケーター */}
        <div className="zr-container border-b border-[#eadfe4]"><ProgressSteps steps={["結果", "詳細", "任意", "完了"]} currentStep={step - 1} /></div>

        {/* Step 1：当落確認 */}
        {step === 1 && (
          <>
            <CompactEventPickerSection
              headingId="ticket-event-picker-title"
              title="報告する公演"
              events={events}
              selectedEventId={selectedEvent}
              loading={eventsLoading}
              onSelect={(id) => {
                const targetEvent = events.find((e) => e.id === id);
                if (targetEvent) {
                  const newVenueType = getVenueType(targetEvent.venue);
                  const areas = SEAT_AREAS[newVenueType];
                  if (seatArea !== "" && !areas.includes(seatArea)) setSeatArea("");
                }
                setSelectedEvent(id);
              }}
            />
            <main className="zr-container space-y-8 pb-12 pt-4">
            {/* 今回の結果 */}
            <div>
              <p className="artist-kicker">CHOOSE RESULT</p>
              <h2 className="mb-5 mt-1 text-[22px] font-black tracking-[-0.035em]">
                今回の結果を教えてください
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setResult("当選した"); setStep(2); }}
                  className={`zr-focus overflow-hidden border-2 transition-all ${
                    result === "当選した"
                      ? "border-[#f43679]"
                      : "border-transparent opacity-80"
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
                  className={`zr-focus overflow-hidden border-2 transition-all ${
                    result === "落選した"
                      ? "border-[#f43679]"
                      : "border-transparent opacity-80"
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
          </>
        )}

        {/* Step 2：必須情報 */}
        {step === 2 && (
          <main className="zr-container space-y-7 pb-12 pt-8">
            {/* 共通項目 */}
            <section className="community-panel p-5">
              <p className="artist-kicker">02 / REQUIRED</p>
              <h2 className="artist-heading">必須情報</h2>
              <p className="mb-6 mt-2 text-[10px] font-bold text-[#817981]">報告に必要な項目です</p>
              <div className="space-y-4">
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
              <section className="border-t border-[#f43679] bg-white p-4 sm:p-5">
                <p className="artist-kicker">SEAT DETAIL</p>
                <h2 className="artist-heading text-[#f43679]">座席情報</h2>
                <div className="mb-5 mt-3 h-px bg-[#ded8dc]" />
                <div className="space-y-4">

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
                          onChange={(v) => setRow(normalizeSeatField(v, "列"))}
                          placeholder="例：3"
                          required
                        />
                        <SeatInput
                          label="席番号"
                          value={seatNumber}
                          onChange={(v) => setSeatNumber(normalizeSeatNumber(v))}
                          placeholder="例：1"
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
                          onChange={(v) => setRow(normalizeSeatField(v, "列"))}
                          placeholder="例：3"
                          required
                        />
                        <SeatInput
                          label="席番号"
                          value={seatNumber}
                          onChange={(v) => setSeatNumber(normalizeSeatNumber(v))}
                          placeholder="例：1"
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
                          onChange={(v) => setRow(normalizeSeatField(v, "列"))}
                          placeholder="例：3"
                          required
                        />
                        <SeatInput
                          label="席番号"
                          value={seatNumber}
                          onChange={(v) => setSeatNumber(normalizeSeatNumber(v))}
                          placeholder="例：1"
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
                className={`zr-focus flex min-h-[52px] w-full items-center justify-center text-[13px] font-black text-white transition-opacity ${
                  step2CanProceed
                    ? "bg-[#f43679]"
                    : "cursor-not-allowed bg-[#f43679]/35"
                }`}
              >
                次へ進む
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

        {/* Step 3：任意・コメント */}
        {step === 3 && (
          <main className="zr-container space-y-7 pb-12 pt-8">
            <section className="border-t border-[#1c171b] pt-5">
              <p className="artist-kicker">03 / OPTIONAL</p>
              <h2 className="artist-heading">任意で詳しく</h2>
              <p className="mb-6 mt-2 text-[10px] font-bold text-[#817981]">入力は任意です</p>
              <div className="space-y-4">
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
            <section className="border-t border-[#ded8dc] pt-5">
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
                className="zr-focus mt-3 h-32 w-full resize-none border border-[#ded8dc] bg-white p-3 text-[12px] font-medium leading-6 outline-none placeholder:text-[#b5adb2] focus:border-[#f43679]"
                placeholder={`例：FC2次で当選しました！\n例：FC1次は落選、FC2次で当選しました\n例：条件付きで当選しました\n例：アプグレ落選でした`}
              />
              <div className="mt-1 text-right text-[9px] text-gray-400">
                {comment.length} / 200
              </div>
            </section>

            {/* ボタン */}
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
                {submitting ? "投稿中..." : "報告を送信する"}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
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
