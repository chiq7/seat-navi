import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "パスワード再設定｜ちけレポ",
  description: "ちけレポのパスワード再設定ページです。",
  alternates: { canonical: "https://tixrepo.com/password-reset" },
  robots: { index: false, follow: false },
};

export default function PasswordResetLayout({ children }: { children: ReactNode }) {
  return children;
}
