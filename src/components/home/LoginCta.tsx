"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginCta() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <div className="zr-container my-16 flex flex-col gap-6 border-y border-[#d8d1d6] py-8 sm:flex-row sm:items-center">
      {/* Ticket icon */}
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffe5ee]"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF6B9D">
          <path d="M20 12c0-1.1.9-2 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-1.99.9-1.99 2v4c1.1 0 1.99.9 1.99 2s-.89 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2zm-2-1.46V15H6V10.55c1.17-.69 2-1.96 2-3.55h8c0 1.59.83 2.86 2 3.55z" />
        </svg>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-[18px] font-black leading-snug text-[#1c171b]">
          {loggedIn ? "マイページ" : "推し優先表示にするにはログイン"}
        </p>
        <p className="mt-2 text-[12px] leading-6 text-[#706870]">
          {loggedIn ? "投稿履歴・当選率・推し設定を確認できます" : "お気に入り登録や推しの公演を優先表示できます"}
        </p>
      </div>

      {/* Login button */}
      <Link
        href={loggedIn ? "/mypage" : "/login"}
        className="zr-focus inline-flex min-h-12 shrink-0 items-center justify-center rounded-full px-7 text-[13px] font-bold text-white"
        style={{ backgroundColor: "#FF6B9D" }}
      >
        {loggedIn ? "開く" : "ログイン"}
      </Link>
    </div>
  );
}
