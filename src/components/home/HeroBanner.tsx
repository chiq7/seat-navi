import Image from "next/image";
import heroImage from "../../../public/images/hero/top.png";

export default function HeroBanner() {
  return (
    <div className="px-4 pt-3 pb-1">
      <div className="relative h-[180px] overflow-hidden rounded-[20px] bg-[#180824]">
        <Image
          src={heroImage}
          alt="TixRepo ちけレポ"
          fill
          priority
          placeholder="blur"
          sizes="(max-width: 520px) calc(100vw - 32px), 456px"
          className="object-cover object-center"
        />
      </div>

      {/* Slide indicator dots */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === 0 ? "16px" : "6px",
              height: "6px",
              backgroundColor: i === 0 ? "#FF6B9D" : "#E5E7EB",
            }}
          />
        ))}
      </div>
    </div>
  );
}
