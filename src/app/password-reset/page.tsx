"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { FormActionButton } from "@/components/common/FormActions";
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
    <main className="community-page pb-12">
      <section className="community-hero">
        <Header title="パスワード再設定" backHref="/login" backLabel="ログインへ戻る" showAccount={false} />
        <div className="mx-auto w-[calc(100%-32px)] max-w-[560px] pb-7 pt-4 sm:pb-10 sm:pt-7">
          <KeyRound size={22} strokeWidth={1.7} className="text-[#ef4f87]" aria-hidden="true" />
          <p className="community-eyebrow mt-3">RESET PASSWORD</p>
          <h1 className="mt-2 text-[28px] font-black leading-[1.2] tracking-[-0.05em] text-[#4b4148] sm:text-[34px]">新しいパスワードを<span className="text-[#ef4f87]">設定する。</span></h1>
          <p className="mt-3 text-[12px] font-medium leading-6 text-[#766b72]">8文字以上の新しいパスワードを入力してください。</p>
        </div>
      </section>
      <form onSubmit={submit} className="mx-auto w-[calc(100%-32px)] max-w-[560px] space-y-4 py-7 sm:py-9">
        <label className="block text-[10px] font-black tracking-[0.08em] text-[#625a61]">
          新しいパスワード
          <input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="community-input mt-2 h-[52px] w-full px-4 text-[14px] font-bold text-[#4b4148]" />
        </label>
        {error && <p className="border-l-2 border-[#d35b73] bg-[#fff4f6] px-4 py-3 text-[11px] font-bold text-[#9c3d50]">{error}</p>}
        <FormActionButton disabled={busy} className="disabled:opacity-50">
          {busy ? "更新中..." : "パスワードを更新"}
        </FormActionButton>
      </form>
    </main>
  );
}
