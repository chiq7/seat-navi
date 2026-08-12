import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/common/StaticPage";

export const metadata: Metadata = {
  title: "利用規約｜ちけレポ",
  description: "ちけレポの利用規約です。",
  alternates: { canonical: "https://tixrepo.com/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <StaticPage title="利用規約">
      <div className="space-y-5">
        <p className="text-right text-[11px] text-[#958d93]">最終更新日：2026年7月14日</p>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">第1条（サービスについて）</h2>
          <p>ちけレポは、チケット当落、座席情報、座席予想、現地レポ、セットリスト等を共有する非公式サービスです。アーティスト、事務所、興行主、会場、プレイガイドその他の関係者とは関係ありません。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">第2条（投稿と権利）</h2>
          <p>利用者は、自身の責任で投稿を行うものとします。投稿内容に関する権利は、投稿者または正当な権利者に帰属します。利用者は、運営者がサービス上での表示、共有、紹介、改善および宣伝に必要な範囲で投稿を利用することを許諾します。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">第3条（禁止事項）</h2>
          <p>虚偽、なりすまし、誹謗中傷、権利侵害、不正転売、詐欺、スパム、不正アクセス、大量取得または転載を禁止します。氏名、住所、電話番号、会員番号、受付番号、QRコード、バーコードその他の個人情報・認証情報を投稿してはいけません。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">第4条（投稿の管理）</h2>
          <p>運営者は、不適切と判断した投稿を事前の通知なく非表示、修正または削除できるものとします。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">第5条（情報の取扱いと免責）</h2>
          <p>掲載情報の正確性、完全性、最新性を保証しません。公演日時、チケット、会場等の重要な情報は、必ず公式発表も確認してください。利用者が本サービスの利用により生じた損害について、運営者は責任を負いません。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">第6条（サービスの変更・停止・終了）</h2>
          <p>運営者は、必要に応じて本サービスの内容を変更、停止または終了できるものとします。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">第7条（準拠法・お問い合わせ）</h2>
          <p>本規約は日本法を準拠法とします。本規約に関するお問い合わせは、<Link href="/contact" className="font-semibold text-[#FF6B9D]">お問い合わせページ</Link>からご連絡ください。</p>
        </section>
      </div>
    </StaticPage>
  );
}
