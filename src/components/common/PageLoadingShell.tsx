import { Header } from "@/components/common/Header";

type PageLoadingShellProps = {
  title: string;
  eyebrow: string;
  heading: string;
  backHref?: string;
  backLabel?: string;
  blocks?: number;
};

/** Route transition and client boot fallback: keep the page structure visible. */
export function PageLoadingShell({
  title,
  eyebrow,
  heading,
  backHref = "/",
  backLabel = "TOPへ戻る",
  blocks = 2,
}: PageLoadingShellProps) {
  return (
    <main className="community-page pb-20">
      <section className="community-hero">
        <Header title={title} backHref={backHref} backLabel={backLabel} />
        <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
          <p className="community-eyebrow">{eyebrow}</p>
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[36px]">{heading}</h1>
        </div>
      </section>
      <div className="zr-container space-y-4 py-7" aria-busy="true" aria-label={`${title}を読み込み中`}>
        {Array.from({ length: blocks }, (_, item) => (
          <div key={item} className="animate-pulse border-y border-[#ded8dc] bg-white px-4 py-5">
            <div className="h-3 w-24 bg-[#f2e9ed]" />
            <div className="mt-3 h-5 w-2/3 bg-[#f8f3f5]" />
            <div className="mt-5 h-12 bg-[#fcf8fa]" />
          </div>
        ))}
      </div>
    </main>
  );
}
