import type { EditorialSeoProfile } from "@/lib/seoProfiles";
import { ExternalLink } from "lucide-react";

type SeoEditorialSectionProps = {
  title: string;
  profile: EditorialSeoProfile;
  className?: string;
};

export default function SeoEditorialSection({
  title,
  profile,
  className = "",
}: SeoEditorialSectionProps) {
  return (
    <section className={className}>
      <p className="artist-kicker">About &amp; Access</p>
      <h2 className="artist-heading">{title}</h2>
      <div className="mt-7 border border-[#ded8dc] bg-white">
        <p className="px-5 py-6 text-[13px] font-medium leading-7 text-[#625a61] sm:px-7 sm:py-8">{profile.summary}</p>

        <dl className="grid grid-cols-2 border-l border-t border-[#ded8dc] sm:grid-cols-4">
          {profile.facts.map((fact) => (
            <div key={fact.label} className="min-w-0 border-b border-r border-[#ded8dc] bg-[#fcfbfc] px-4 py-4">
              <dt className="text-[9px] font-black tracking-[0.12em] text-[#958d93]">{fact.label}</dt>
              <dd className="mt-2 text-[12px] font-black leading-5 text-[#1c171b]">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div>
          {profile.sections.map((section) => (
            <div key={section.heading} className="border-b border-[#ded8dc] px-5 py-5 last:border-b-0 sm:grid sm:grid-cols-[180px_1fr] sm:gap-7 sm:px-7 sm:py-6">
              <h3 className="text-[13px] font-black tracking-[-0.02em] text-[#1c171b]">{section.heading}</h3>
              <p className="mt-2 text-[12px] font-medium leading-6 text-[#625a61] sm:mt-0">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-[#ded8dc] bg-[#1c171b] px-5 py-5 text-white sm:px-7">
          <p className="text-[9px] font-black tracking-[0.12em] text-white/42">情報確認日：{profile.updatedAt}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {profile.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="zr-focus inline-flex min-h-8 items-center gap-1.5 text-[10px] font-black text-[#ff5b96] underline underline-offset-4"
              >
                {source.label}<ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
