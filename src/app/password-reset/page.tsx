"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function PasswordResetPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) setError(authError.message);
    else router.replace("/mypage");
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f5f6] text-[#1c171b]">
      <section className="bg-[#0d090d] text-white">
        <header className="zr-container flex h-16 items-center">
          <Link href="/login" aria-label="ログインへ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/8"><ChevronLeft size={26} /></Link>
        </header>
        <div className="zr-container pb-10 pt-5">
          <KeyRound size={28} strokeWidth={1.6} className="text-[#ff5b96]" aria-hidden="true" />
          <p className="mt-6 text-[10px] font-black tracking-[0.22em] text-[#ff5b96]">RESET PASSWORD</p>
          <h1 className="mt-3 text-[38px] font-black leading-tight tracking-[-0.05em]">新しいパスワードを<br />設定する。</h1>
          <p className="mt-4 text-[11px] font-bold leading-5 text-white/62">8文字以上の新しいパスワードを入力してください。</p>
        </div>
      </section>
      <form onSubmit={submit} className="zr-container space-y-5 py-9">
        <label className="block text-[11px] font-black text-[#544e52]">
          新しいパスワード
          <input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="zr-focus mt-2 h-[52px] w-full border border-[#ded8dc] bg-white px-4 text-[14px] font-bold outline-none focus:border-[#f43679]" />
        </label>
        {error && <p className="border border-red-200 bg-red-50 px-3 py-3 text-[11px] font-bold text-red-600">{error}</p>}
        <button disabled={busy} className="zr-focus min-h-[52px] w-full bg-[#f43679] text-[13px] font-black text-white disabled:opacity-50">
          {busy ? "更新中..." : "パスワードを更新"}
        </button>
      </form>
    </main>
  );
}
