import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { buildFileImageMetadata } from "@/lib/fileImageMetadata";
import { getCachedPublicEvent } from "@/lib/serverEventData";

type RouteProps = { params: Promise<{ id: string }> };
type LayoutProps = RouteProps & { children: ReactNode };

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { id } = await params;
  if (!(await getCachedPublicEvent(id))) notFound();
  return buildFileImageMetadata({
    path: `/events/${id}/fan-seat-prediction`,
    title: "座席予想を投稿｜ちけレポ",
    description: "この公演のアリーナ配置や座席の予想を投稿できます。",
    robots: { index: false, follow: true },
  });
}

export default async function FanSeatPredictionLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  if (!(await getCachedPublicEvent(id))) notFound();
  return children;
}
