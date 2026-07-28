import type { EditorialSeoProfile } from "@/lib/seoProfiles";

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
      <h2 className="mb-3 text-[16px] font-bold text-gray-900">{title}</h2>
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-[13px] leading-6 text-gray-700">{profile.summary}</p>

        <dl className="mt-4 grid grid-cols-2 gap-2">
          {profile.facts.map((fact) => (
            <div key={fact.label} className="rounded-xl bg-[#FFF8FB] px-3 py-2.5">
              <dt className="text-[10px] font-bold text-gray-400">{fact.label}</dt>
              <dd className="mt-1 text-[12px] font-bold leading-5 text-gray-800">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 space-y-4">
          {profile.sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-[14px] font-bold text-gray-900">{section.heading}</h3>
              <p className="mt-1.5 text-[12px] leading-6 text-gray-600">{section.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-gray-100 pt-3">
          <p className="text-[10px] text-gray-400">情報確認日：{profile.updatedAt}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {profile.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-medium text-[#FF6B9D] underline underline-offset-2"
              >
                {source.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

