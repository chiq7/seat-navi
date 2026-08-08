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
    <main className="community-page">
      <section className="community-hero">
        <header className="zr-container flex h-16 items-center">
          <Link href="/login" aria-label="ログインへ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2b252b] shadow-sm"><ChevronLeft size={26} /></Link>
        </header>
        <div className="zr-container pb-10 pt-5">
          <KeyRound size={28} strokeWidth={1.6} className="text-[#ef4f87]" aria-hidden="true" />
          <p className="community-eyebrow mt-6">RESET PASSWORD</p>
          <h1 className="community-title mt-3">新しいパスワードを<br /><span className="text-[#ef4f87]">設定する。</span></h1>
          <p className="community-subtitle mt-4">8文字以上の新しいパスワードを入力してください。</p>
        </div>
      </section>
      <form onSubmit={submit} className="zr-container space-y-5 py-9">
        <label className="block text-[11px] font-black text-[#544e52]">
          新しいパスワード
          <input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="community-input mt-2 h-[52px] w-full px-4 text-[14px] font-bold" />
        </label>
        {error && <p className="border border-red-200 bg-red-50 px-3 py-3 text-[11px] font-bold text-red-600">{error}</p>}
        <button disabled={busy} className="community-primary-button min-h-[52px] w-full disabled:opacity-50">
          {busy ? "更新中..." : "パスワードを更新"}
        </button>
      </form>
    </main>
  );
}
