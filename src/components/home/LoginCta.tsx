"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Ticket } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function LoginCta() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="zr-container my-12">
      <Link
        href={loggedIn ? "/mypage" : "/login"}
        className="zr-focus group block overflow-hidden border border-[#282127] bg-white"
      >
        <div className="flex items-center justify-between bg-[#1c171b] px-4 py-3 text-white sm:px-5">
          <span className="text-[9px] font-black tracking-[0.2em] text-[#ff5b96]">YOUR ARCHIVE</span>
          <span className="text-[9px] font-black tracking-[0.16em] text-white/50">MY PAGE</span>
        </div>
        <div className="grid min-h-[104px] grid-cols-[1fr_64px]">
          <div className="flex min-w-0 items-center gap-4 px-4 py-5 sm:px-5">
            <Ticket size={24} strokeWidth={1.7} className="shrink-0 text-[#f43679]" />
            <div className="min-w-0">
              <p className="text-[18px] font-black leading-snug tracking-[-0.035em] text-[#1c171b]">
                {loggedIn ? "自分のライブ記録" : "推しのライブを記録する"}
              </p>
              <p className="mt-1 text-[11px] font-medium leading-5 text-[#706870]">
                {loggedIn ? "投稿履歴・当選率・推し設定を確認" : "ログインして推しの公演を優先表示"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center border-l border-[#282127] bg-[#fff0f5] text-[#f43679] transition-colors group-hover:bg-[#f43679] group-hover:text-white">
            <ArrowUpRight size={22} strokeWidth={1.8} />
          </div>
        </div>
      </Link>
    </div>
  );
}
