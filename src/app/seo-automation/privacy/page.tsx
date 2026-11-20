import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/common/StaticPage";

export const metadata: Metadata = {
  title: "SEO自動集計のプライバシーに関する説明｜ちけレポ",
  description: "ちけレポ SEO自動集計で取得するGoogleデータ、利用目的、保存、Geminiでの処理、アクセス停止について。",
  alternates: { canonical: "https://tixrepo.com/seo-automation/privacy" },
  robots: { index: true, follow: true },
};

const heading = "mb-2 text-[16px] font-bold text-[#4b4148]";
const link = "font-semibold text-[#b52e64] underline underline-offset-4 hover:text-[#8c214c]";

export default function SeoAutomationPrivacyPage() {
  return (
    <StaticPage title="SEO自動集計のプライバシー">
      <div className="space-y-7 text-[14px] leading-7 sm:text-[15px]">
        <p className="text-[12px] text-[#665a61]">最終更新日：2026年11月18日</p>
        <p>本説明は、<Link href="/seo-automation" className={link}>ちけレポ SEO自動集計</Link>によるGoogleデータの利用に適用します。ちけレポ運営者が、自分のサイトの集計データを扱う個人利用ツールです。</p>
        <section>
          <h2 className={heading}>取得・利用する情報</h2>
          <p>Google Search Consoleの検索語、ページURL、クリック数、表示回数、CTR、平均掲載順位と、GA4の入口ページ、セッション数、集計ユーザー数、エンゲージメント等を取得します。サイトの利用状況の把握と改善候補の検討に使用します。個々の訪問者を特定するための情報は取得しません。</p>
        </section>
        <section>
          <h2 className={heading}>保存場所と更新</h2>
          <p>データは運営者が管理するGoogleスプレッドシートに保存し、Google Apps Scriptで処理します。集計結果は定期更新時に上書きします。更新に失敗した場合は前回のデータが残ることがあるため、更新日時と状態を表示します。Googleの実行ログや履歴には、同サービスの保持設定が適用されます。</p>
        </section>
        <section>
          <h2 className={heading}>Geminiとデータの共有</h2>
          <p>運営者がGeminiで分析を指示した場合、指定した集計データがGoogleのGemini機能に参照・処理されます。その際のデータ取扱いは、使用するGoogleアカウント、プランおよびGoogleの利用条件・プライバシー設定に従います。スクリプトからGemini APIやその他の外部AIサービスへデータを自動送信する機能はありません。</p>
          <p className="mt-3">Googleから得たデータを販売したり、広告配信や汎用AIモデルの学習のために提供したりする用途には利用しません。集計シートや取得した解析データを一般公開する機能はありません。</p>
        </section>
        <section>
          <h2 className={heading}>アクセスの停止・削除</h2>
          <p><a href="https://myaccount.google.com/connections" className={link}>Googleアカウントの接続設定</a>でアクセスを取り消せます。定期取得を止める場合はApps Scriptのトリガーを削除します。保存済みデータは集計シートの該当タブまたはファイルを削除して管理します。Googleサービス内の変更履歴やログの扱いは同サービスの設定に従います。</p>
        </section>
        <section>
          <h2 className={heading}>管理・問い合わせ先</h2>
          <p><a href="mailto:2222color@gmail.com" className={link}>2222color@gmail.com</a>。本人からの依頼であることを確認して対応します。</p>
        </section>
        <nav aria-label="SEO自動集計の関連ページ" className="flex flex-wrap gap-x-6 gap-y-3 border-t border-[#ded8dc] pt-5">
          <Link href="/seo-automation" className={link}>ツールの説明</Link>
          <Link href="/seo-automation/terms" className={link}>利用条件</Link>
        </nav>
      </div>
    </StaticPage>
  );
}
