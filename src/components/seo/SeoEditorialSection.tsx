import type { EditorialSeoProfile } from "@/lib/seoProfiles";
import { ChevronDown, ExternalLink } from "lucide-react";

type SeoEditorialSectionProps = {
  title: string;
  profile: EditorialSeoProfile;
  className?: string;
  reviewDateLabel?: string;
  /** Show the summary and facts as they are and fold the longer sections behind one button (no outer toggle). */
  foldSections?: boolean;
  /** The page lists its sources in one place elsewhere, so this section shows none. */
  sourcesElsewhere?: boolean;
  /** The heading's look on a page that does not use the large section headings; the English label above it is left out too. */
  headingClassName?: string;
};

export default function SeoEditorialSection({
  title,
  profile,
  className = "",
  reviewDateLabel = "情報確認日",
  foldSections = false,
  sourcesElsewhere = false,
  headingClassName,
}: SeoEditorialSectionProps) {
  const sections = profile.sections.map((section) => (
    <div key={section.heading} className="border-b border-[#ded8dc] px-5 py-5 last:border-b-0 sm:grid sm:grid-cols-[180px_1fr] sm:gap-7 sm:px-7 sm:py-6">
      <h3 className="text-[13px] font-black tracking-[-0.02em] text-[#1c171b]">{section.heading}</h3>
      <p className="mt-2 text-[12px] font-medium leading-6 text-[#625a61] sm:mt-0">{section.body}</p>
    </div>
  ));
  if (foldSections) {
    return (
      <section className={className}>
        {!headingClassName && <p className="artist-kicker">About &amp; Access</p>}
        <h2 className={headingClassName ?? "artist-heading"}>{title}</h2>
        <div className="mt-5 border border-[#ded8dc] bg-white sm:mt-7">
          <p className="px-5 py-5 text-[13px] font-medium leading-7 text-[#625a61] sm:px-7 sm:py-6">{profile.summary}</p>
          <dl className="grid grid-cols-2 border-t border-[#ded8dc] sm:grid-cols-4">
            {profile.facts.map((fact) => (
              <div key={fact.label} className="min-w-0 border-b border-r border-[#ded8dc] bg-[#fcfbfc] px-4 py-4 sm:border-b-0 sm:last:border-r-0">
                <dt className="text-[9px] font-black tracking-[0.12em] text-[#958d93]">{fact.label}</dt>
                <dd className="mt-2 text-[12px] font-black leading-5 text-[#1c171b]">{fact.value}</dd>
              </div>
            ))}
          </dl>
          {sections.length > 0 && <details className="group border-t border-[#ded8dc]">
            <summary className="zr-focus mx-5 my-4 flex min-h-11 cursor-pointer list-none items-center justify-center gap-1 rounded-full bg-[#fff0f5] px-5 text-[12px] font-black text-[#c93868] sm:mx-7 [&::-webkit-details-marker]:hidden">
              ライブで気をつけること<ChevronDown size={16} aria-hidden="true" className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-[#ded8dc]">{sections}</div>
          </details>}
        </div>
      </section>
    );
  }
  return (
    <section className={className}>
      {!headingClassName && <p className="artist-kicker">About &amp; Access</p>}
      <h2 className={headingClassName ?? "artist-heading"}>{title}</h2>
      <div className="mt-5 sm:mt-7">
        <input id="seo-editorial-toggle" type="checkbox" className="peer sr-only sm:hidden" />
        <label htmlFor="seo-editorial-toggle" className="zr-focus flex min-h-12 cursor-pointer items-center justify-between rounded-full bg-[#fff0f5] px-5 text-[12px] font-black text-[#c93868] sm:hidden">
          詳しい情報・アクセスを見る
          <ChevronDown size={16} aria-hidden="true" />
        </label>
      <div className="mt-4 hidden border border-[#ded8dc] bg-white peer-checked:block sm:mt-0 sm:block">
        <p className="px-5 py-6 text-[13px] font-medium leading-7 text-[#625a61] sm:px-7 sm:py-8">{profile.summary}</p>

        <dl className="grid grid-cols-2 border-l border-t border-[#ded8dc] sm:grid-cols-4">
          {profile.facts.map((fact) => (
            <div key={fact.label} className="min-w-0 border-b border-r border-[#ded8dc] bg-[#fcfbfc] px-4 py-4">
              <dt className="text-[9px] font-black tracking-[0.12em] text-[#958d93]">{fact.label}</dt>
              <dd className="mt-2 text-[12px] font-black leading-5 text-[#1c171b]">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div>{sections}</div>

        {!sourcesElsewhere && <div className="border-t border-[#eadfe4] bg-[#f8f1f5] px-5 py-5 text-[#51454c] sm:px-7">
          <p className="text-[9px] font-black tracking-[0.12em] text-[#91838c]">{reviewDateLabel}：{profile.updatedAt}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {profile.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="zr-focus inline-flex min-h-8 items-center gap-1.5 text-[10px] font-black text-[#c93868] underline underline-offset-4"
              >
                {source.label}<ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>}
      </div>
      </div>
    </section>
  );
}
