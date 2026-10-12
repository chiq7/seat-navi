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
      className="zr-focus group flex items-center gap-3 rounded-2xl bg-[#ffe9f1] p-4 transition hover:bg-[#ffe0ec]"
    >
      <div className="shrink-0">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-[#e94a7d]">
          <Heart size={21} fill="currentColor" aria-hidden="true" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-black leading-[1.25] text-[#49323c]">
          {loggedIn ? "自分のライブ記録" : "ログインで記録を保存"}
        </p>
        <p className="mt-1 text-[12px] leading-5 text-[#795064]">
          {loggedIn ? "投稿履歴・当選率・推し設定を確認" : "チケット記録を保存して、推しを登録しよう！"}
        </p>
      </div>
      <ArrowUpRight size={20} className="shrink-0 text-[#a62b59]" aria-hidden="true" />
    </Link>
  );
}
