import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Search, Ticket, MapPinned, MessageSquareText, Music2 } from "lucide-react";
import { Header } from "@/components/common/Header";

const PAGE_URL = "https://tixrepo.com/news/how-to-use-tixrepo";

export const metadata: Metadata = {
  title: "ちけレポでできること｜当落・座席・現地レポの使い方",
  description: "ちけレポでできることを紹介します。公演の探し方、当落・座席報告、現地レポ、セトリの確認方法をまとめました。",
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "ちけレポでできること｜当落・座席・現地レポの使い方",
    description: "当落・座席・現地レポ・セトリをまとめて確認する、ちけレポの使い方です。",
    url: PAGE_URL,
    type: "article",
    locale: "ja_JP",
  },
};

const features = [
  {
    icon: <Search size={19} />,
    title: "公演を探す",
    text: "アーティスト名や公演名から検索できます。アーティストページでは、開催予定・過去の公演を日付順で確認できます。",
  },
  {
    icon: <Ticket size={19} />,
    title: "当落結果を報告・確認する",
    text: "当選・落選、申込区分などの報告を集め、公演ごとの当選傾向を見やすくします。",
  },
  {
    icon: <MapPinned size={19} />,
    title: "座席情報とアリーナ予想図を見る",
    text: "実際の座席報告と、みんなの予想図を公演ごとに確認できます。座席の見え方を考えるための材料として使えます。",
  },
  {
    icon: <MessageSquareText size={19} />,
    title: "現地レポを読む・投稿する",
    text: "会場で分かったことや参加時の感想を、現地レポとして共有できます。",
  },
  {
    icon: <Music2 size={19} />,
    title: "セトリを確認する",
    text: "公演ごとに追加されたセットリストを確認できます。未登録の場合は、参加者が追加できます。",
  },
];

export default function HowToUseTixRepoPage() {
  return (
    <div className="min-h-screen bg-[#FFF8FB]">
      <Header title="ちけレポからのお知らせ" backHref="/news" />
      <main className="px-4 py-5">
        <article className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-[#FFF0F6] to-white px-5 py-6">
            <p className="text-[11px] font-bold tracking-[0.08em] text-[#D94878]">ちけレポの使い方</p>
            <h1 className="mt-3 text-[24px] font-bold leading-[1.45] text-gray-900">ちけレポでできること</h1>
            <p className="mt-3 text-[13px] leading-7 text-gray-600">
              ちけレポは、ライブやイベントの当落・座席・現地レポ・セトリを、公演ごとに確認・共有できるサイトです。
            </p>
          </div>

          <section className="border-t border-pink-100 px-5 py-5">
            <h2 className="text-[16px] font-bold text-gray-900">使い方はシンプルです</h2>
            <ol className="mt-3 space-y-2.5 text-[13px] leading-6 text-gray-700">
              <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF6B9D] text-[11px] font-bold text-white">1</span>アーティスト名や公演名で、参加する公演を探す</li>
              <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF6B9D] text-[11px] font-bold text-white">2</span>当落や座席、現地で分かったことを必要な範囲で報告する</li>
              <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF6B9D] text-[11px] font-bold text-white">3</span>みんなの報告から、次の申込や参加準備の参考にする</li>
            </ol>
          </section>

          <section className="border-t border-pink-100 px-5 py-5">
            <h2 className="text-[16px] font-bold text-gray-900">主な機能</h2>
            <div className="mt-3 divide-y divide-pink-100">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="mt-0.5 shrink-0 text-[#FF6B9D]" aria-hidden="true">{feature.icon}</div>
                  <div>
                    <h3 className="text-[14px] font-bold text-gray-900">{feature.title}</h3>
                    <p className="mt-1 text-[13px] leading-6 text-gray-600">{feature.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-pink-100 bg-[#FFF8FB] px-5 py-5">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-gray-900"><CheckCircle2 size={18} className="text-[#FF6B9D]" aria-hidden="true" />正確な情報共有にご協力ください</h2>
            <p className="mt-2 text-[13px] leading-7 text-gray-700">
              投稿は、ご自身で確認できた内容を中心にお願いします。公演や座席の状況は変わることがあるため、公式案内もあわせてご確認ください。
            </p>
            <Link href="/search" className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-[#FF6B9D] px-4 py-2.5 text-[13px] font-bold text-white no-underline">
              アーティスト・公演を探す
            </Link>
          </section>
        </article>
      </main>
    </div>
  );
}
