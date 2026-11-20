import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/common/Breadcrumbs";
import { VerificationAccess } from "@/components/analytics/VerificationAccess";

export const metadata: Metadata = {
  title: "運営者の確認アクセス | ちけレポ",
  robots: { index: false, follow: false },
};

export default function VerificationAccessPage() {
  return <><Breadcrumbs current="運営者の確認アクセス" /><VerificationAccess /></>;
}
