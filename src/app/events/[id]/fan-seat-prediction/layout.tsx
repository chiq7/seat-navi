import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getCachedSeoEvent, SITE_URL } from "@/lib/seoData";

type RouteProps = { params: Promise<{ id: string }> };
type LayoutProps = RouteProps & { children: ReactNode };

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  if (!(await getCachedSeoEvent(id))) notFound();
  return {
    title: "座席予想を投稿｜ちけレポ",
    alternates: { canonical: `${SITE_URL}/events/${id}/fan-seat-prediction` },
    robots: { index: false, follow: true },
  };
}

export default async function FanSeatPredictionLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  if (!(await getCachedSeoEvent(id))) notFound();
  return children;
}
