import type { Metadata } from "next";
import { VerificationAccess } from "@/components/analytics/VerificationAccess";

export const metadata: Metadata = {
  title: "運営者の確認アクセス | ちけレポ",
  robots: { index: false, follow: false },
};

export default function VerificationAccessPage() {
  return <VerificationAccess />;
}
