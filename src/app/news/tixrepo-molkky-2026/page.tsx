import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, CircleDollarSign, Clock3, MapPin, Users } from "lucide-react";
import { NewsArticleLayout } from "@/components/news/NewsArticleLayout";
import { serializeJsonLd } from "@/lib/structuredData";

const PAGE_URL = "https://tixrepo.com/news/tixrepo-molkky-2026";
const EVENT_NAME = "モルック初心者交流大会";

export const metadata: Metadata = {
  title: "モルック初心者交流大会を開催します｜ちけレポ",
  description:
    "ちけレポ開設記念・スポーツ体験イベント第1弾。2026年12月1日、駒沢オリンピック公園でモルック初心者交流大会を開催します。",
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "モルック初心者交流大会を開催します｜ちけレポ",
    description: "ちけレポ開設記念・スポーツ体験イベント第1弾。初心者歓迎のモルック交流大会です。",
    url: PAGE_URL,
    type: "article",
    siteName: "ちけレポ",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary",
    title: "モルック初心者交流大会を開催します｜ちけレポ",
    description: "初心者歓迎のモルック交流大会を開催します。",
  },
};

const eventStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Event",
      "@id": `${PAGE_URL}#event`,
      name: EVENT_NAME,
      description:
        "ちけレポ開設記念・スポーツ体験イベント第1弾。初心者向けのルール説明と練習時間を設けたモルック交流大会です。",
      url: PAGE_URL,
      startDate: "2026-12-01T13:00:00+09:00",
      endDate: "2026-12-01T17:00:00+09:00",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      organizer: {
        "@id": "https://tixrepo.com/#organization",
        name: "ちけレポ",
        url: "https://tixrepo.com",
      },
      location: {
        "@type": "Place",
        name: "駒沢オリンピック公園",
        address: {
          "@type": "PostalAddress",
          postalCode: "154-0013",
          addressRegion: "東京都",
          addressLocality: "世田谷区",
          streetAddress: "駒沢公園1-1",
          addressCountry: "JP",
        },
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ちけレポ", item: "https://tixrepo.com" },
        { "@type": "ListItem", position: 2, name: "ちけレポからのお知らせ", item: "https://tixrepo.com/news" },
        { "@type": "ListItem", position: 3, name: EVENT_NAME, item: PAGE_URL },
      ],
    },
  ],
};

const schedule = [
  ["12:30", "受付開始"],
  ["13:00", "開会・初心者向けルール説明"],
  ["13:10", "練習タイム"],
  ["13:20", "試合開始（総当たり戦）"],
  ["16:50", "表彰・結果発表"],
  ["17:00", "解散"],
] as const;

function DetailRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-[#ded8dc] py-3 last:border-b-0">
      <div className="mt-0.5 shrink-0 text-[#FF6B9D]" aria-hidden="true">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gray-500">{label}</p>
        <div className="mt-0.5 text-[14px] font-semibold leading-6 text-gray-900">{children}</div>
      </div>
    </div>
  );
}

export default function TixRepoMolkkyNewsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventStructuredData) }} />
      <NewsArticleLayout kicker="TIXREPO EVENT" title={<>モルック初心者交流大会を<br />開催します</>} lead="木の棒を投げてピンを倒す、北欧生まれのスポーツ「モルック」。ルールを知らない方も、ひとりでの参加も歓迎です。">
        <div className="border-t border-divider bg-white">
          <div className="px-5 py-2 sm:px-7">
            <DetailRow icon={<CalendarDays size={18} />} label="日時">2026年12月1日（火）13:00〜17:00</DetailRow>
            <DetailRow icon={<MapPin size={18} />} label="会場">
              駒沢オリンピック公園
              <span className="block text-[12px] font-normal text-gray-500">駒沢大学駅から徒歩約10分／バスケットコート前集合</span>
            </DetailRow>
            <DetailRow icon={<CircleDollarSign size={18} />} label="参加費">500円</DetailRow>
            <DetailRow icon={<Users size={18} />} label="対象・定員">初心者歓迎・年齢問わず／10名</DetailRow>
          </div>

          <section className="border-t border-[#ded8dc] p-5 sm:p-7">
            <h2 className="text-[16px] font-bold text-gray-900">はじめてでも楽しめます</h2>
            <p className="mt-2 text-[13px] leading-7 text-gray-700">
              当日は最初にルールと道具の使い方を説明し、練習時間を取ってから試合を始めます。運動経験やモルック経験は問いません。友人との参加はもちろん、ひとりでの参加も歓迎します。
            </p>
          </section>

          <section className="border-t border-[#ded8dc] p-5 sm:p-7">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-gray-900">
              <Clock3 size={17} className="text-[#FF6B9D]" aria-hidden="true" />当日の流れ
            </h2>
            <dl className="mt-3 border border-[#ded8dc] text-[13px]">
              {schedule.map(([time, detail]) => (
                <div key={time} className="grid grid-cols-[62px_1fr] border-b border-gray-100 last:border-b-0">
                  <dt className="bg-[#fff0f5] px-3 py-2.5 font-bold text-[#D94878]">{time}</dt>
                  <dd className="px-3 py-2.5 text-gray-700">{detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="border-t border-[#ded8dc] p-5 sm:p-7">
            <h2 className="text-[16px] font-bold text-gray-900">持ち物・参加にあたって</h2>
            <p className="mt-2 text-[13px] leading-7 text-gray-700">
              動きやすい服装と飲み物をご用意ください。屋外での開催を予定しているため、天候状況による変更や中止の案内は、参加受付ページでお知らせします。
            </p>
          </section>

          <section className="border-t border-[#ded8dc] bg-[#fff0f5] p-5 sm:p-7">
            <h2 className="text-[16px] font-bold text-gray-900">参加申込について</h2>
            <p className="mt-2 text-[13px] leading-7 text-gray-700">
              参加受付は外部のイベント募集ページで行います。募集ページの公開後、このお知らせにも申込先を追加します。
            </p>
            <p className="mt-2 text-[13px] leading-7 text-gray-700">
              大会についてのお問い合わせは、<Link href="/contact" className="font-bold text-[#D94878] underline underline-offset-2">ちけレポのお問い合わせページ</Link>からお願いします。
            </p>
          </section>
        </div>
      </NewsArticleLayout>
    </>
  );
}
