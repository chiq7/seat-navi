import { BarChart3, Camera, Map, Music } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  slug: string;
};

type NavItem = { label: string; icon: LucideIcon; href: string };

export default function ArtistPageBottomNav({ slug }: Props) {
  const navItems: NavItem[] = [
    { label: "集計まとめ", icon: BarChart3, href: "#trend" },
    { label: "座席予想",   icon: Map,      href: "#map" },
    { label: "現地レポ",   icon: Camera,   href: `/artists/${slug}/after-reports` },
    { label: "セトリ",     icon: Music,    href: `/artists/${slug}/setlist` },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[390px] px-4 pb-3">
      <div className="grid grid-cols-4 rounded-[24px] border border-white/70 bg-white/90 px-2 py-2 shadow-[0_-8px_30px_rgba(17,24,39,0.08)] backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold text-gray-400 no-underline"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full">
                <Icon size={16} strokeWidth={2} />
              </span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
