import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/common/StaticPage";

export const metadata: Metadata = {
  title: "プライバシーポリシー｜ちけレポ",
  description: "ちけレポのプライバシーポリシーです。",
  alternates: { canonical: "https://tixrepo.com/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <StaticPage title="プライバシーポリシー">
      <div className="space-y-5">
        <p className="text-right text-[11px] text-[#958d93]">最終更新日：2026年7月14日</p>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">1. 取得する可能性がある情報</h2>
          <p>投稿内容、投稿画像、コメント、お問い合わせ内容、利用者が任意に提供したメールアドレス等を取得する場合があります。また、IPアドレス、ブラウザ・端末・OS情報、アクセス日時、閲覧ページ、Cookie、アクセスログ、エラーログ等を取得する場合があります。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">2. 利用目的</h2>
          <p>取得した情報は、サービスの提供・運営、投稿の表示・管理・共有、不正利用・規約違反の防止、投稿の承認・非表示・削除、お問い合わせ対応、障害調査・セキュリティ確保、利用状況の分析・機能改善のために利用します。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">3. 投稿内容の公開</h2>
          <p>投稿内容はインターネット上で公開されます。個人情報、会員番号、受付番号、QRコード、バーコード等を投稿しないようご注意ください。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">4. 第三者提供・外部サービス</h2>
          <p>法令に基づく場合等を除き、本人の同意なく個人情報を第三者へ提供しません。サービスの提供・運営にあたり、Supabase、Vercel等の外部サービスを利用します。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">5. Cookie等と安全管理</h2>
          <p>Cookie等を使用する場合があります。運営者は、情報の漏えい、滅失または毀損の防止その他の安全管理のため、合理的な措置を講じます。</p>
        </section>
        <section>
          <h2 className="text-[15px] font-black text-[#4b4148]">6. 保存期間・開示等のご依頼</h2>
          <p>情報は利用目的の達成に必要な期間保存します。開示、訂正または削除に関するご依頼は、本人確認を行ったうえで法令に従い対応します。お問い合わせは、<Link href="/contact" className="font-semibold text-[#FF6B9D]">お問い合わせページ</Link>からご連絡ください。</p>
        </section>
      </div>
    </StaticPage>
  );
}
