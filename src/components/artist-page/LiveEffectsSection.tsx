import Image from "next/image";

const EFFECTS: { key: string; label: string; active: boolean }[] = [
  { key: "center-stage", label: "センステ", active: true },
  { key: "trolley", label: "トロッコ", active: true },
  { key: "aisle-walk", label: "客降り", active: true },
  { key: "silver-tape", label: "銀テープ", active: false },
  { key: "fanservice", label: "ファンサ", active: true },
];

export default function LiveEffectsSection() {
  return (
    <section className="mt-5 px-4">
      <h2 className="mb-2.5 text-[13px] font-bold text-gray-900">この公演で見られた演出</h2>
      <div className="flex gap-2">
        {EFFECTS.map((effect) => {
          const src = `/images/reports/ive-effects/${effect.key}-${effect.active ? "active" : "inactive"}.png`;
          return (
            <div
              key={effect.key}
              className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-[#FF6B9D]/20 bg-white px-1 py-2.5"
            >
              <Image
                src={src}
                alt={effect.label}
                width={36}
                height={36}
                className="object-contain"
              />
              <span className="whitespace-nowrap text-[9px] font-semibold text-gray-600">
                {effect.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
