import { BarChart3, Camera, ListMusic, Map, MessageCircle } from "lucide-react";

type Props = {
  artistName: string;
  slug: string;
  seatHref?: string | null;
  seatDescription?: string;
  photoCount: number;
  publicReportCount?: number | null;
  nextVenuePhotos?: { id: string; name: string; count: number } | null;
};

export default function ArtistActionHub({ artistName, slug, seatHref, seatDescription, photoCount, publicReportCount, nextVenuePhotos }: Props) {
  const emptyLabel = publicReportCount === 0 ? "公演写真0枚\n" : "";
  const photos = photoCount > 0
    ? { href: "#artist-seat-photos", label: "席からの写真", description: `公演の写真${photoCount}枚` }
    : publicReportCount != null && publicReportCount > 0
      ? { href: `/artists/${slug}/after-reports#artist-seat-reports`, label: "現地レポを見る", description: `このアーティストのレポ${publicReportCount}件` }
      : nextVenuePhotos
        ? { href: `/venues/${nextVenuePhotos.id}#venue-photo-list`, label: "次の会場の写真", description: `${emptyLabel}${nextVenuePhotos.name} ${nextVenuePhotos.count}枚` }
        : { href: "/venues#seat-photos", label: "会場の写真を探す", description: `${emptyLabel}会場別の一覧へ` };
  const actions = [
    {
      href: "#ticket-data",
      label: "当落を見る",
      description: "届いた報告",
      Icon: BarChart3,
      cardClass: "bg-[#fff0f5]",
      iconClass: "text-[#e94a7d]",
      descriptionClass: "text-[#a2697e]",
    },
    {
      href: seatHref ?? "/venues",
      label: "座席表",
      description: seatDescription ?? (seatHref ? "集まった座席・配置" : "会場から探す"),
      Icon: Map,
      cardClass: "bg-[#f2edff]",
      iconClass: "text-[#7655b2]",
      descriptionClass: "text-[#7c718e]",
    },
    {
      ...photos,
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
      cardClass: "bg-[#edf6ff]",
      iconClass: "text-[#397fb8]",
      descriptionClass: "text-[#687f91]",
    },
  ];

  return (
    <section className="artist-section" aria-labelledby="artist-action-title">
      <h2 id="artist-action-title" className="artist-heading">
        {artistName}のライブ情報
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 lg:grid-cols-5">
        {actions.map(({ href, label, description, Icon, cardClass, iconClass, descriptionClass }) => (
          <a
            key={label}
            href={href}
            aria-label={label === photos.label ? `${artistName}の${label}。${description}` : `${artistName}の${label}`}
            className={`zr-focus group flex min-h-[72px] items-center gap-2 rounded-[16px] px-2.5 py-2.5 transition hover:-translate-y-0.5 sm:min-h-[126px] sm:flex-col sm:items-stretch sm:justify-between sm:rounded-[20px] sm:p-4 lg:min-h-[142px] ${cardClass}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/75 sm:h-10 sm:w-10">
              <Icon size={18} strokeWidth={1.9} className={iconClass} />
            </span>
            <span className="min-w-0 flex-1 sm:flex-none [word-break:normal] [overflow-wrap:anywhere]">
              <span className="block text-[14px] font-black leading-snug tracking-[-0.035em] text-[#40383d] sm:text-[17px]">
                {label}<span aria-hidden="true" data-link-direction className="ml-1 inline-block">{href.startsWith("#") ? "↓" : "→"}</span>
              </span>
              <span className={`mt-1 block whitespace-pre-line text-[12px] font-bold leading-relaxed ${descriptionClass}`}>
                {description}
              </span>
            </span>
          </a>
        ))}
        <a href="#fan-board" aria-label={`${artistName}のファン掲示板`} className="zr-focus group col-span-2 flex min-h-[64px] items-center gap-2.5 rounded-[16px] bg-[#f7f4f5] px-3 py-2.5 transition hover:-translate-y-0.5 sm:min-h-[72px] sm:rounded-[20px] sm:px-4 lg:col-span-1 lg:min-h-[142px] lg:flex-col lg:items-stretch lg:justify-between lg:p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white sm:h-10 sm:w-10">
            <MessageCircle size={19} strokeWidth={1.9} className="text-[#665761]" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-between gap-2 lg:flex-none lg:items-end">
            <span className="min-w-0">
              <span className="block text-[14px] font-black leading-tight tracking-[-0.035em] text-[#40383d] sm:text-[17px]">ファン掲示板</span>
              <span className="mt-1 block text-[12px] font-bold leading-relaxed text-[#887982]">交流・情報交換</span>
            </span>
            <span data-link-direction className="shrink-0 font-bold text-[#665761]" aria-hidden="true">↓</span>
          </span>
        </a>
      </div>
    </section>
  );
}

