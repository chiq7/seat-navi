export default function HeroBanner() {
  return (
    <div className="px-4 pt-3 pb-1">
      <div
        className="relative rounded-[20px] overflow-hidden h-[180px]"
        style={{
          backgroundImage: "url('/images/hero/top.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
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
