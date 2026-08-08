import Link from "next/link";
import { CircleUserRound } from "lucide-react";

type Props = {
  className?: string;
  iconSize?: number;
  tone?: "dark" | "light";
};

export function AccountLink({ className = "", iconSize = 21, tone = "dark" }: Props) {
  return (
    <Link
      href="/mypage"
      aria-label="マイページ"
      className={`zr-focus flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-gray-100/50 ${
        tone === "light" ? "text-white" : "text-gray-700"
      } ${className}`}
    >
      <CircleUserRound size={iconSize} strokeWidth={2.2} />
    </Link>
  );
}
