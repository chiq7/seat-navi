"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/common/Header";
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
    <main className="min-h-screen bg-[#FFF8FB]">
      <Header title="パスワード再設定" backHref="/login" showAccount={false} />
      <form onSubmit={submit} className="space-y-4 px-5 pt-8">
        <label className="block text-[11px] font-bold text-gray-700">
          新しいパスワード
          <input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-gray-200 px-4 text-[13px] outline-none focus:border-[#FF6B9D]" />
        </label>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] text-red-600">{error}</p>}
        <button disabled={busy} className="h-12 w-full rounded-full bg-[#FF6B9D] text-[13px] font-bold text-white disabled:opacity-60">
          {busy ? "更新中..." : "パスワードを更新"}
        </button>
      </form>
    </main>
  );
}
