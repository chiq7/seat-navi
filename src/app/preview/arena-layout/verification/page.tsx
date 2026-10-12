import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReferenceValidationPreview } from "./ReferenceValidationPreview";

export const metadata: Metadata = { title: "座席報告の答え合わせ | ちけレポ試作", robots: { index: false, follow: false } };
export default function VerificationPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ReferenceValidationPreview />;
}
