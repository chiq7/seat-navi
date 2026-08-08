import Link from "next/link";
import { ArrowRight, Heart, MessageCircle, Search } from "lucide-react";

export default function HeroBanner() {
  return (
    <section className="relative isolate overflow-hidden bg-[#fff0f6] text-[#2b252b]">
      <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#ff9fc1]/45 blur-3xl" />
      <div className="absolute -bottom-36 left-[18%] h-72 w-72 rounded-full bg-[#d8cbff]/35 blur-3xl" />
      <div className="zr-container relative grid gap-6 py-8 sm:gap-8 sm:py-16 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[10px] font-black tracking-[0.12em] text-[#d83d72] shadow-sm">
            <Heart size={14} fill="currentColor" aria-hidden="true" /> FAN COMMUNITY
          </p>
          <h1 className="mt-4 text-[36px] font-black leading-[1.08] tracking-[-0.06em] sm:mt-5 sm:text-[58px] lg:text-[54px] xl:text-[60px]">
            <span className="block">ライブのこと、</span>
            <span className="block text-[#ed4a83]">ファン同士で<span className="block sm:inline">話そう。</span></span>
          </h1>
          <p className="mt-4 max-w-[590px] text-[12px] font-medium leading-6 text-[#675860] sm:mt-5 sm:text-[16px] sm:leading-7">
            当落、座席、現地の熱、セトリ。実際に行ったファンの記録を、推し・公演ごとに集めています。
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-7 sm:flex sm:flex-wrap sm:gap-3">
            <Link href="/search" className="zr-focus inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-[#ef4f87] px-3 text-[11px] font-black text-white shadow-[0_10px_24px_rgba(239,79,135,.24)] transition hover:bg-[#db3e73] sm:gap-2 sm:px-5 sm:text-[13px]">
              <Search size={16} /> 推しを探す <ArrowRight size={14} />
            </Link>
            <Link href="/report" className="zr-focus inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-black text-[#6b5561] shadow-sm transition hover:bg-[#fffafd] sm:gap-2 sm:px-5 sm:text-[13px]">
              <MessageCircle size={16} className="text-[#ef4f87]" /> レポを投稿
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[28px] bg-white/65 p-3 shadow-[0_18px_50px_rgba(185,91,127,.12)] backdrop-blur-sm sm:p-4">
          <Link href="/search" className="zr-focus min-h-[96px] rounded-[18px] bg-[#fff1f6] p-3 transition hover:-translate-y-0.5 sm:min-h-[122px] sm:rounded-[20px] sm:p-4">
            <span className="text-[10px] font-black tracking-[0.12em] text-[#de4678]">TICKET</span>
            <p className="mt-2 text-[15px] font-black tracking-[-0.04em] sm:mt-3 sm:text-[18px]">当落の記録</p>
            <p className="mt-1 text-[11px] font-medium text-[#8b6f7b]">当選率・抽選傾向</p>
          </Link>
          <Link href="/search" className="zr-focus min-h-[96px] rounded-[18px] bg-[#eff2ff] p-3 transition hover:-translate-y-0.5 sm:min-h-[122px] sm:rounded-[20px] sm:p-4">
            <span className="text-[10px] font-black tracking-[0.12em] text-[#6176d7]">SEAT</span>
            <p className="mt-2 text-[15px] font-black tracking-[-0.04em] sm:mt-3 sm:text-[18px]">座席の見え方</p>
            <p className="mt-1 text-[11px] font-medium text-[#68718e]">座席表・アリーナ予想</p>
          </Link>
          <Link href="/report/live" className="zr-focus min-h-[96px] rounded-[18px] bg-[#fff3ed] p-3 transition hover:-translate-y-0.5 sm:min-h-[122px] sm:rounded-[20px] sm:p-4">
            <span className="text-[10px] font-black tracking-[0.12em] text-[#cf744c]">LIVE</span>
            <p className="mt-2 text-[15px] font-black tracking-[-0.04em] sm:mt-3 sm:text-[18px]">現地のレポ</p>
            <p className="mt-1 text-[11px] font-medium text-[#987363]">演出・会場の雰囲気</p>
          </Link>
          <Link href="/search" className="zr-focus min-h-[96px] rounded-[18px] bg-[#f5f0ff] p-3 transition hover:-translate-y-0.5 sm:min-h-[122px] sm:rounded-[20px] sm:p-4">
            <span className="text-[10px] font-black tracking-[0.12em] text-[#8165bb]">SETLIST</span>
            <p className="mt-2 text-[15px] font-black tracking-[-0.04em] sm:mt-3 sm:text-[18px]">セトリを探す</p>
            <p className="mt-1 text-[11px] font-medium text-[#7c718e]">公演ごとの曲順</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
