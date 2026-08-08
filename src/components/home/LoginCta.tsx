"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function LoginCta() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <Link
      href={loggedIn ? "/mypage" : "/login"}
      className="zr-focus group flex min-h-[166px] flex-col justify-between rounded-[22px] bg-[#ffe9f1] p-4 transition hover:-translate-y-1 sm:min-h-[214px] sm:rounded-[28px] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-[#e94a7d]">
          <Heart size={21} fill="currentColor" aria-hidden="true" />
        </span>
        <ArrowUpRight size={23} strokeWidth={2} className="shrink-0 text-[#e94a7d] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
      </div>
      <div>
        <p className="text-[10px] font-black tracking-[0.16em] text-[#e34b7c]">MY TIXREPO</p>
        <p className="mt-2 text-[17px] font-black leading-[1.25] tracking-[-0.05em] text-[#49323c] sm:text-[30px]">
          {loggedIn ? "自分のライブ記録" : "推しを登録する"}
        </p>
        <p className="mt-3 hidden text-[12px] font-bold leading-6 text-[#916377] sm:block sm:text-[13px]">
          {loggedIn ? "投稿履歴・当選率・推し設定を確認" : "推しの公演を優先表示して、投稿履歴を残す"}
        </p>
      </div>
    </Link>
  );
}
