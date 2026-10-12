import Link from "next/link";
import StaticPage from "@/components/common/StaticPage";
import { buildMeta, SITE_URL } from "@/lib/metadata";
import { serializeJsonLd } from "@/lib/structuredData";

const description = "ちけレポは、ライブ・コンサートの公演情報と、ファンの当落・座席・現地レポをつなぐ非公式の情報共有サイトです。会場ガイド、報告の読み方、情報の出典と更新方針を紹介します。";
export const metadata = buildMeta({ path: "/about", title: "ちけレポについて｜ライブの当落・座席・会場情報を共有するサイト", description });

export default function AboutPage() {
  return <StaticPage title="ちけレポについて">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", "@type": "AboutPage", name: "ちけレポについて", url: `${SITE_URL}/about`, description, inLanguage: "ja" }) }} />
    <div className="space-y-9 [&_h2]:text-[18px] [&_h2]:font-black [&_h2]:leading-7 [&_h2]:text-[#4b4148] [&_p]:mt-3 [&_p]:text-[14px] [&_p]:leading-7 [&_a]:font-bold [&_a]:text-[#ad285b] [&_a]:underline [&_a]:underline-offset-4">
      <p className="!mt-0">{description} 行く前の準備にも、公演後の振り返りにも、ほかのファンが共有した体験を役立てられます。</p>
      <nav aria-label="ちけレポの主なページ" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href="/" className="inline-flex min-h-11 items-center">公演・アーティストを探す</Link>
        <Link href="/venues" className="inline-flex min-h-11 items-center">ライブ会場一覧</Link>
        <Link href="/report" className="inline-flex min-h-11 items-center">体験を報告する</Link>
      </nav>
      <section><h2>ライブへ行く前の「知りたい」を探す</h2>
        <p>チケットの席はどこか、駅からどう向かうか、大きな荷物をどこへ預けるか。初めての会場では、準備に必要な情報がいくつもの場所に分かれています。ちけレポは公演、アーティスト、会場をつなぎ、来場前に確認したい情報と実際に参加した人の報告を探しやすくまとめています。</p>
        <p>公演日や会場から予定を調べる人、座席の位置や周辺設備を確認したい人、応募結果や現地の体験を共有したい人に向けたサイトです。<Link href="/search">検索ページ</Link>でも公演やアーティストを探せます。</p>
      </section>
      <section><h2>会場ガイドで座席・設備・荷物を確認する</h2>
        <p><Link href="/venues">会場ガイド</Link>では、座席の区画・階層・位置関係を図から探せます。列・番号を照合できた範囲はチケットの表記で検索でき、未対応の番号は確認中として案内します。場内のトイレ・売店・ロッカー、場外の主要駅・ゲート・周辺施設、駅や店舗の荷物預かりも、確認できた情報を図や一覧から探せます。</p>
        <p>会場モードや対象の棟が異なると配置も変わります。ライブの仮設アリーナ、展示ホールの客席、当日のステージや使用席は公演ごとの案内が必要です。常設席の参考図を、すべての公演に使える確定座席表として扱わないでください。</p>
      </section>
      <section><h2>アーティストと公演の情報をつなぐ</h2>
        <p>アーティストページでは、公演予定や公式ニュース、当落・座席の報告、現地レポ、セットリストへの案内を確認できます。公演ページからは開催日・会場と、その公演に寄せられた報告を探せます。公開対象の公演では、当日の案内やまとめへの導線も表示します。</p>
        <p>公演情報は公式発表を優先して確認してください。受付方法、販売条件、時間の変更や入場規制は、主催者やプレイガイドの最新案内が優先されます。掲載がないことを、公演や設備が存在しないという意味には扱いません。</p>
      </section>
      <section><h2>当落・座席・現地レポを共有する</h2>
        <p><Link href="/report/ticket">チケット・座席の報告</Link>や<Link href="/report/live">現地レポ</Link>から、公演を選んで体験を共有できます。当落や席の報告は応募・参加した人の情報、現地レポは会場の見え方や公演を体験した人の情報です。写真や感想を読むときは、撮影位置・公演・投稿内容の違いも考慮してください。</p>
        <p>表示される当選率などの集計は寄せられた報告にもとづき、すべての応募者を調べた公式結果ではありません。投稿数が少ない場合や条件が異なる場合は、一般化せず参考として読んでください。</p>
        <p>投稿前に<Link href="/terms">利用規約</Link>をご確認ください。チケットのQRコード、バーコード、受付番号、氏名など、本人やチケットを特定できる情報を載せないでください。</p>
      </section>
      <section><h2>公式情報・投稿・予想を読み分ける</h2>
        <p>会場や交通の案内は、会場・鉄道会社・施設運営元などの公開資料を確認して整理しています。利用者の投稿は個人の体験で、公式発表とは別の情報です。座席の見え方やアリーナの予想は参考情報であり、当日の席・ステージ・視界を保証するものではありません。</p>
        <p>公式図、過年度の資料、競技や公演のモードは適用範囲を区別します。未確認の番号、個別入口、料金、営業時間、営業状況や空きを推測で確定情報にしません。荷物の取り出し時間や入場前の利用可否は、施設ごとの案内と当日の条件をご確認ください。</p>
      </section>
      <section><h2>情報の出典と更新方針</h2>
        <p>公式・運営元の資料を優先し、必要に応じて補助資料を照合します。会場の改修、名称変更、設備や利用条件の変更、届いた訂正内容を確認して、必要な掲載情報を見直します。すべての席・設備・当日の条件まで確認済みであることを意味しません。</p>
        <p>変更に気づいた場合は、該当ページと確認できる公式案内を添えて<Link href="/contact">お問い合わせ</Link>からお知らせください。掲載情報と公式案内が異なる場合は、公式・主催者の最新案内を優先してください。</p>
      </section>
      <section><h2>お気に入りとマイページ</h2>
        <p>ログインして利用できるお気に入りや<Link href="/mypage">マイページ</Link>もあります。公開情報の閲覧と、アカウントに関わる機能は分かれています。アカウントの利用は<Link href="/login">ログインページ</Link>から案内に沿って進められます。</p>
      </section>
      <section><h2>非公式の情報共有サイトとして</h2>
        <p>ちけレポは、アーティスト、所属事務所、興行主、会場、プレイガイドとは関係のない非公式サービスです。チケットの販売・当選・指定席や施設の空きを保証するサービスではありません。</p>
        <p>運営への連絡は<Link href="/contact">お問い合わせ</Link>へ。情報の取り扱いは<Link href="/privacy">プライバシーポリシー</Link>、利用条件は<Link href="/terms">利用規約</Link>で確認できます。</p>
      </section>
    </div>
  </StaticPage>;
}
