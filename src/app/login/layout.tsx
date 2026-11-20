import { buildFileImageMetadata } from "@/lib/fileImageMetadata";
import type { ReactNode } from "react";

export const metadata = buildFileImageMetadata({
  path: "/login",
  title: "ログイン・新規登録｜ちけレポ",
  description: "ちけレポへのログインと新規登録ページです。",
  robots: { index: false, follow: false },
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
