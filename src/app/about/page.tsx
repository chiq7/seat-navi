import Image from "next/image";
import Link from "next/link";
import { ArrowDown, RotateCcw } from "lucide-react";
import StaticPage from "@/components/common/StaticPage";
import { buildMeta, SITE_URL } from "@/lib/metadata";
import { serializeJsonLd } from "@/lib/structuredData";

const description = "ちけレポは、ライブ・コンサートの公演情報と、ファンの当落・座席・現地レポをつなぐ非公式の情報共有サイトです。会場ガイド、報告の読み方、情報の出典と更新方針を紹介します。";
export const metadata = buildMeta({ path: "/about", title: "ちけレポについて｜ライブの当落・座席・会場情報を共有するサイト", description });

const FLOW = [
  { when: "行く前に", title: "座席表と席からの写真を見る", note: "会場の地図で自分の区画を探す", image: "/images/home-features/tixrepo-seating-chart.webp", href: "/venues" },
  { when: "当落・発券のころ", title: "アリーナの配置を予想する", note: "みんなの座席報告で位置がわかる", image: "/images/home-features/tixrepo-arena-prediction-final.webp", href: "/#upcoming-events" },
  { when: "行ったあとに", title: "当落・座席・現地レポを送る", note: "ログイン不要・公演を選ぶだけ", image: "/images/home-features/tixrepo-onsite-reports.webp", href: "/report" },
] as const;

export default function AboutPage() {
  return <StaticPage title="ちけレポについて">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ "@context": "https://schema.org", "@type": "AboutPage", name: "ちけレポについて", url: `${SITE_URL}/about`, description, inLanguage: "ja" }) }} />
    <div className="space-y-9 [&_h2]:text-[18px] [&_h2]:font-black [&_h2]:leading-7 [&_h2]:text-[#4b4148] [&_p]:mt-3 [&_p]:text-[14px] [&_p]:leading-7 [&_a]:font-bold [&_a]:text-[#ad285b] [&_a]:underline [&_a]:underline-offset-4">
      <p className="!mt-0">ちけレポ（チケレポ・ちけれぽ）は、ライブの座席表・席からの写真・公演情報を探せる、ファンのための非公式サイトです。</p>
      {/* The site in one look: before the show you look things up, after it you report, and that report helps the next
          person. The three steps are the same pictures as the home banners. */}
      <figure className="!mt-5" aria-labelledby="about-flow-caption">
        <ol className="m-0 grid list-none gap-0 p-0">
          {FLOW.map((step, index) => <li key={step.href}>
            <Link href={step.href} className="zr-focus flex items-center gap-3 rounded-2xl border border-[#ecd2de] bg-white p-2 !no-underline">
              <Image src={step.image} alt="" width={1536} height={1024} unoptimized className="h-auto w-[42%] max-w-[180px] shrink-0 rounded-xl" />
              <span className="min-w-0">
                <span className="block text-[11px] font-bold text-[#a12b58]">{step.when}</span>
                <span className="mt-0.5 block text-[15px] font-black leading-6 text-[#40383d]">{step.title}</span>
                <span className="mt-0.5 block text-[12px] font-medium leading-5 text-[#706670]">{step.note}</span>
              </span>
            </Link>
            {index < FLOW.length - 1 && <ArrowDown size={20} aria-hidden="true" className="mx-auto my-1 text-[#d6a3b9]" />}
          </li>)}
        </ol>
        <figcaption id="about-flow-caption" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#fff0f5] px-3 py-2 text-[13px] font-bold text-[#8a2850]">
          <RotateCcw size={16} aria-hidden="true" />届いた報告が、次に行く人の座席表と写真になります
        </figcaption>
      </figure>
      <section><h2>会場ガイドで座席・設備・荷物を確認する</h2>
        <p><Link href="/venues">会場を選び</Link>、地図から自分の区画を探せます。写真の印を押すと、席からの写真がその場で開きます。列・番号での検索や、トイレ・ロッカー・駅からの道順も確認できます。</p>
        <p>会場モードや対象の棟が異なると配置も変わります。ライブの仮設アリーナ、展示ホールの客席、当日のステージや使用席は公演ごとの案内が必要です。常設席の参考図を、すべての公演に使える確定座席表として扱わないでください。</p>
      </section>
      <section><h2>アーティストと公演の情報をつなぐ</h2>
        <p><Link href="/search">アーティスト名や公演名で検索</Link>すると、日付・会場を選んで座席報告や現地レポを確認できます。会場の座席写真には、別の公演で撮影された参考写真も含まれます。</p>
        <p>公演情報は公式発表を優先して確認してください。受付方法、販売条件、時間の変更や入場規制は、主催者やプレイガイドの最新案内が優先されます。掲載がないことを、公演や設備が存在しないという意味には扱いません。</p>
      </section>
      <section><h2>当落・座席・現地レポを共有する</h2>
        <p><Link href="/report/ticket">チケット・座席の報告</Link>や<Link href="/report/live">現地レポ</Link>から、公演を選んで体験を共有できます。当落や席の報告は応募・参加した人の情報、現地レポは会場の見え方や公演を体験した人の情報です。写真や感想を読むときは、撮影位置・公演・投稿内容の違いも考慮してください。</p>
        <p>表示される当選率などの集計は寄せられた報告にもとづき、すべての応募者を調べた公式結果ではありません。投稿数が少ない場合や条件が異なる場合は、一般化せず参考として読んでください。</p>
        <p>投稿前に<Link href="/terms">利用規約</Link>をご確認ください。チケットのQRコード、バーコード、受付番号、氏名など、本人やチケットを特定できる情報を載せないでください。</p>
      </section>
      <details className="rounded-2xl border border-[#eadfe4] bg-white px-4 py-1 [&_section]:mt-6">
        <summary className="zr-focus flex min-h-12 cursor-pointer items-center text-[15px] font-black text-[#4b4148]">運営方針・情報の扱い・お問い合わせ</summary>
      <section><h2>公式情報・投稿・予想を読み分ける</h2>
        <p>会場や交通の案内は、会場・鉄道会社・施設運営元などの公開資料を確認して整理しています。利用者の投稿は個人の体験で、公式発表とは別の情報です。座席の見え方やアリーナの予想は参考情報であり、当日の席・ステージ・視界を保証するものではありません。</p>
        <p>公式図、過年度の資料、競技や公演のモードは適用範囲を区別します。未確認の番号、個別入口、料金、営業時間、営業状況や空きを推測で確定情報にしません。荷物の取り出し時間や入場前の利用可否は、施設ごとの案内と当日の条件をご確認ください。</p>
      </section>
        <section><h2>情報の出典と更新方針</h2>
        <p>公式・運営元の資料を優先し、必要に応じて補助資料を照合します。会場の改修、名称変更、設備や利用条件の変更、届いた訂正内容を確認して、必要な掲載情報を見直します。すべての席・設備・当日の条件まで確認済みであることを意味しません。</p>
        <p>変更に気づいた場合は、該当ページと確認できる公式案内を添えて<Link href="/contact">お問い合わせ</Link>からお知らせください。掲載情報と公式案内が異なる場合は、公式・主催者の最新案内を優先してください。</p>
      </section>
        <section><h2>お気に入りとマイページ</h2>
        <p>座席表・写真・公演情報はログインせずに見られます。<Link href="/login">ログイン</Link>すると、お気に入りのアーティストを登録し、<Link href="/mypage">マイページ</Link>で確認できます。</p>
      </section>
        <section><h2>非公式の情報共有サイトとして</h2>
        <p>ちけレポは、アーティスト、所属事務所、興行主、会場、プレイガイドとは関係のない非公式サービスです。チケットの販売・当選・指定席や施設の空きを保証するサービスではありません。</p>
        <p>運営への連絡は<Link href="/contact">お問い合わせ</Link>へ。情報の取り扱いは<Link href="/privacy">プライバシーポリシー</Link>、利用条件は<Link href="/terms">利用規約</Link>で確認できます。</p>
      </section>
        <div className="pb-4" />
      </details>
    </div>
  </StaticPage>;
}
