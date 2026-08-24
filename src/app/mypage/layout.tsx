import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMeta } from "@/lib/metadata";

export const metadata: Metadata = buildMeta({
  path: "/mypage",
  title: "マイページ｜ちけレポ",
  description: "推しの登録、保存した公演、ちけレポへの投稿履歴を確認できます。",
});

export default function MyPageLayout({ children }: { children: ReactNode }) {
  return children;
}
