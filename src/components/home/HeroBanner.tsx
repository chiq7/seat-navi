import Link from "next/link";
import { ArrowRight, Heart, MessageCircle, Search } from "lucide-react";

export default function HeroBanner() {
  return (
    <section className="relative isolate overflow-hidden bg-[#fff0f6] text-[#2b252b]">
      <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#ff9fc1]/45 blur-3xl" />
      <div className="absolute -bottom-36 left-[18%] h-72 w-72 rounded-full bg-[#d8cbff]/35 blur-3xl" />
      <div className="zr-container relative grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[10px] font-black tracking-[0.12em] text-[#d83d72] shadow-sm">
            <Heart size={14} fill="currentColor" aria-hidden="true" /> FAN COMMUNITY
          </p>
          <h1 className="mt-5 text-[42px] font-black leading-[1.08] tracking-[-0.06em] sm:text-[58px] lg:text-[54px] xl:text-[60px]">
            <span className="block">ライブのこと、</span>
            <span className="block text-[#ed4a83]">ファン同士で<span className="block sm:inline">話そう。</span></span>
          </h1>
          <p className="mt-5 max-w-[590px] text-[14px] font-medium leading-7 text-[#675860] sm:text-[16px]">
            当落、座席の見え方、現地の熱、セットリストまで。実際にライブへ行ったファンの記録を、推しごと・公演ごとに集めています。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/search" className="zr-focus inline-flex min-h-12 items-center gap-2 rounded-full bg-[#ef4f87] px-5 text-[13px] font-black text-white shadow-[0_10px_24px_rgba(239,79,135,.24)] transition hover:bg-[#db3e73]">
              <Search size={17} /> 推しの情報を見る <ArrowRight size={16} />
            </Link>
            <Link href="/report" className="zr-focus inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-black text-[#6b5561] shadow-sm transition hover:bg-[#fffafd]">
              <MessageCircle size={17} className="text-[#ef4f87]" /> レポを投稿する
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-[28px] bg-white/65 p-3 shadow-[0_18px_50px_rgba(185,91,127,.12)] backdrop-blur-sm sm:p-4">
          <Link href="/search" className="zr-focus min-h-[122px] rounded-[20px] bg-[#fff1f6] p-4 transition hover:-translate-y-0.5">
            <span className="text-[10px] font-black tracking-[0.12em] text-[#de4678]">TICKET</span>
            <p className="mt-3 text-[18px] font-black tracking-[-0.04em]">当落の記録</p>
            <p className="mt-1 text-[11px] font-medium text-[#8b6f7b]">当選率・抽選傾向</p>
          </Link>
          <Link href="/search" className="zr-focus min-h-[122px] rounded-[20px] bg-[#eff2ff] p-4 transition hover:-translate-y-0.5">
            <span className="text-[10px] font-black tracking-[0.12em] text-[#6176d7]">SEAT</span>
            <p className="mt-3 text-[18px] font-black tracking-[-0.04em]">座席の見え方</p>
            <p className="mt-1 text-[11px] font-medium text-[#68718e]">座席表・アリーナ予想</p>
          </Link>
          <Link href="/report/live" className="zr-focus min-h-[122px] rounded-[20px] bg-[#fff3ed] p-4 transition hover:-translate-y-0.5">
            <span className="text-[10px] font-black tracking-[0.12em] text-[#cf744c]">LIVE</span>
            <p className="mt-3 text-[18px] font-black tracking-[-0.04em]">現地のレポ</p>
            <p className="mt-1 text-[11px] font-medium text-[#987363]">演出・会場の雰囲気</p>
          </Link>
          <Link href="/search" className="zr-focus min-h-[122px] rounded-[20px] bg-[#f5f0ff] p-4 transition hover:-translate-y-0.5">
            <span className="text-[10px] font-black tracking-[0.12em] text-[#8165bb]">SETLIST</span>
            <p className="mt-3 text-[18px] font-black tracking-[-0.04em]">セトリを探す</p>
            <p className="mt-1 text-[11px] font-medium text-[#7c718e]">公演ごとの曲順</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
