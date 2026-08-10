import { BarChart3, Camera, ChevronRight, ListMusic, Map, MessageCircle } from "lucide-react";

type Props = {
  artistName: string;
  slug: string;
};

export default function ArtistActionHub({ artistName, slug }: Props) {
  const actions = [
    {
      href: "#ticket-data",
      label: "当落を見る",
      description: "当選率・結果",
      Icon: BarChart3,
      cardClass: "bg-[#fff0f5]",
      iconClass: "text-[#e94a7d]",
      descriptionClass: "text-[#a2697e]",
    },
    {
      href: "#seat-map",
      label: "座席を見る",
      description: "座席表・見え方",
      Icon: Map,
      cardClass: "bg-[#edf0ff]",
      iconClass: "text-[#6176d7]",
      descriptionClass: "text-[#68718e]",
    },
    {
      href: "#reports",
      label: "現地レポ",
      description: "写真・会場の様子",
      Icon: Camera,
      cardClass: "bg-[#fff1ea]",
      iconClass: "text-[#dd8053]",
      descriptionClass: "text-[#987363]",
    },
    {
      href: `/artists/${slug}/setlist`,
      label: "セトリ",
      description: "曲順・MC",
      Icon: ListMusic,
      cardClass: "bg-[#f4efff]",
      iconClass: "text-[#8165bb]",
      descriptionClass: "text-[#7c718e]",
    },
  ];

  return (
    <section className="artist-section" aria-labelledby="artist-action-title">
      <p className="artist-kicker">Fan&apos;s guide</p>
      <h2 id="artist-action-title" className="artist-heading">
        {artistName}のライブ情報
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 lg:grid-cols-5">
        {actions.map(({ href, label, description, Icon, cardClass, iconClass, descriptionClass }) => (
          <a
            key={href}
            href={href}
            aria-label={`${artistName}の${label}`}
            className={`zr-focus group flex min-h-[72px] items-center gap-2 rounded-[16px] px-2.5 py-2.5 transition hover:-translate-y-0.5 sm:min-h-[126px] sm:flex-col sm:items-stretch sm:justify-between sm:rounded-[20px] sm:p-4 lg:min-h-[142px] ${cardClass}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/75 sm:h-10 sm:w-10">
              <Icon size={18} strokeWidth={1.9} className={iconClass} />
            </span>
            <span className="min-w-0 flex-1 sm:flex-none">
              <span className="block whitespace-nowrap text-[14px] font-black leading-tight tracking-[-0.035em] text-[#40383d] sm:text-[17px]">
                {label}
              </span>
              <span className={`mt-0.5 block truncate whitespace-nowrap text-[9px] font-bold leading-tight sm:mt-1 sm:text-[10px] ${descriptionClass}`}>
                {description}
              </span>
            </span>
            <ChevronRight size={15} strokeWidth={2.2} className={`${iconClass} shrink-0 sm:hidden`} aria-hidden="true" />
          </a>
        ))}
        <a href="#fan-board" aria-label={`${artistName}のファン掲示板`} className="zr-focus group col-span-2 flex min-h-[64px] items-center gap-2.5 rounded-[16px] bg-[#f7f4f5] px-3 py-2.5 transition hover:-translate-y-0.5 sm:min-h-[72px] sm:rounded-[20px] sm:px-4 lg:col-span-1 lg:min-h-[142px] lg:flex-col lg:items-stretch lg:justify-between lg:p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white sm:h-10 sm:w-10">
            <MessageCircle size={19} strokeWidth={1.9} className="text-[#665761]" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-between gap-2 lg:flex-none lg:items-end">
            <span className="min-w-0">
              <span className="block text-[14px] font-black leading-tight tracking-[-0.035em] text-[#40383d] sm:text-[17px]">ファン掲示板</span>
              <span className="mt-0.5 block text-[9px] font-bold leading-tight text-[#887982] sm:mt-1 sm:text-[10px]">交流・情報交換</span>
            </span>
            <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-[#887982]" aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  );
}
