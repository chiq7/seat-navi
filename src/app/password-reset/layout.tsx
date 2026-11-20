import { buildFileImageMetadata } from "@/lib/fileImageMetadata";
import type { ReactNode } from "react";

export const metadata = buildFileImageMetadata({
  path: "/password-reset",
  title: "パスワード再設定｜ちけレポ",
  description: "ちけレポのパスワード再設定ページです。",
  robots: { index: false, follow: false },
});

export default function PasswordResetLayout({ children }: { children: ReactNode }) {
  return children;
}
