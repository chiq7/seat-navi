import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/common/StaticPage";

export const metadata: Metadata = {
  title: "ちけレポ SEO自動集計｜ツールの説明",
  description: "ちけレポ運営者向けの、Google Search Console・GA4からGoogleスプレッドシートへの自動集計ツールについて。",
  alternates: { canonical: "https://tixrepo.com/seo-automation" },
  robots: { index: true, follow: true },
};

const heading = "mb-2 text-[16px] font-bold text-[#4b4148]";
const link = "font-semibold text-[#b52e64] underline underline-offset-4 hover:text-[#8c214c]";

export default function SeoAutomationPage() {
  return (
    <StaticPage title="ちけレポ SEO自動集計">
      <div className="space-y-7 text-[14px] leading-7 sm:text-[15px]">
        <p>ちけレポ運営者が、自分のサイトの検索流入と利用状況を確認するための個人利用ツールです。Google Search ConsoleとGoogle Analytics 4の集計データを取得し、運営者が管理するGoogleスプレッドシートに保存します。</p>
        <section>
          <h2 className={heading}>毎週の集計内容</h2>
          <p>毎週月曜日の午前8時台（日本時間）に、3日前までの直近7日・前7日・直近28日を更新します。検索語とページ別のクリック数・表示回数・CTR・平均掲載順位や、GA4の入口ページ別の利用状況を比較できます。取得に失敗した場合は、シートにその状態を表示します。</p>
        </section>
        <section>
          <h2 className={heading}>使用するアクセス権</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Google Search Console・Google Analytics：集計データの読み取り。</li>
            <li>Googleスプレッドシート：スクリプトが紐づく集計シートの表示・管理。</li>
            <li>外部サービスへの接続：Googleの解析APIからデータを取得するための通信。</li>
            <li>本人の不在時の実行：Google Apps Scriptの時間トリガーによる定期更新。</li>
          </ul>
          <p className="mt-3">Googleの解析用権限は、認可したアカウントでアクセス可能なプロパティに及びます。実際の取得対象はちけレポのプロパティに、保存先は専用の集計シートにコードで指定しています。解析プロパティの設定や権限を変更する機能はありません。</p>
        </section>
        <section>
          <h2 className={heading}>Geminiでの分析</h2>
          <p>運営者がGoogleスプレッドシートまたはGoogleドライブの連携機能から指示する際に、Geminiで集計データを分析できます。このスクリプト自体はGemini APIを呼び出しません。Geminiの利用可否とデータの取扱いは、使用するGoogleアカウント・プラン・設定に従います。</p>
        </section>
        <section>
          <h2 className={heading}>データの管理・利用条件</h2>
          <p>集計シートや取得した解析データを一般公開する機能はありません。詳しくは、このツールの<Link href="/seo-automation/privacy" className={link}>プライバシーに関する説明</Link>と<Link href="/seo-automation/terms" className={link}>利用条件</Link>をご確認ください。</p>
          <p className="mt-3">管理・問い合わせ先：<a href="mailto:2222color@gmail.com" className={link}>2222color@gmail.com</a></p>
        </section>
      </div>
    </StaticPage>
  );
}
