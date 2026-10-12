import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ログイン・新規登録｜ちけレポ",
  description: "ちけレポへのログインと新規登録ページです。",
  alternates: { canonical: "https://tixrepo.com/login" },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
