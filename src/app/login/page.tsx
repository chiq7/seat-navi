"use client";

import { Suspense, type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";

function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/mypage";
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginPageInner /></Suspense>;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(searchParams.get("error") ? "ログイン処理を完了できませんでした。もう一度お試しください。" : "");

  async function signInWithGoogle() {
    trackEvent("login_start", { method: "google" });
    setBusy(true);
    setError("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (authError) {
      trackEvent("auth_error", { method: "google", flow: "login" });
      setError(authError.message);
      setBusy(false);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    if (mode === "signup") {
      trackEvent("sign_up_start", { method: "email" });
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (authError) {
        trackEvent("auth_error", { method: "email", flow: "sign_up" });
        setError(authError.message);
      } else {
        trackEvent("sign_up", { method: "email" });
        if (data.session) router.replace(next);
        else setMessage("確認メールを送りました。メール内のリンクを押すと登録が完了します。");
      }
    } else {
      trackEvent("login_start", { method: "email" });
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        trackEvent("auth_error", { method: "email", flow: "login" });
        setError("メールアドレスかパスワードが正しくありません。");
      } else {
        trackEvent("login", { method: "email" });
        router.replace(next);
      }
    }
    setBusy(false);
  }

  async function resetPassword() {
    if (!email) {
      setError("先にメールアドレスを入力してください。");
      return;
    }
    setBusy(true);
    setError("");
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/password-reset`,
    });
    if (authError) setError(authError.message);
    else {
      trackEvent("password_reset_request", { method: "email" });
      setMessage("パスワード再設定メールを送りました。");
    }
    setBusy(false);
  }

  return (
    <main className="community-page pb-10">
      <section className="community-hero">
        <header className="zr-container flex h-16 items-center">
          <Link
            href="/"
            aria-label="TOPへ戻る"
            className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2b252b] shadow-sm"
          >
            <ChevronLeft size={26} strokeWidth={2.7} />
          </Link>
        </header>
        <div className="mx-auto w-[calc(100%-32px)] max-w-[560px] pb-10 pt-5 sm:pb-14 sm:pt-9">
          <p className="community-eyebrow">MY TIXREPO</p>
          <h1 className="community-title mt-3">
            {mode === "login" ? <>ライブの記録を、<br />自分の場所へ。</> : <>自分だけの、<br />ライブ記録を始める。</>}
          </h1>
          <p className="community-subtitle mt-5">
            当落データ、座席予想、現地レポ、推しアーティストをまとめて管理できます。
          </p>
        </div>
      </section>

      <div className="mx-auto w-[calc(100%-32px)] max-w-[560px] py-9">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="artist-kicker">Account</p>
            <h2 className="mt-2 text-[25px] font-black tracking-[-0.04em]">{mode === "login" ? "ログイン" : "新規登録"}</h2>
          </div>
          <ShieldCheck size={24} strokeWidth={1.7} className="text-[#f43679]" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="community-secondary-button mt-7 w-full disabled:opacity-60"
        >
          <span className="text-lg font-bold text-[#4285F4]">G</span>
          Googleで続ける
        </button>

        <div className="my-7 flex items-center gap-3 text-[9px] font-black tracking-[0.14em] text-[#958d93]">
          <div className="h-px flex-1 bg-[#ded8dc]" />OR EMAIL<div className="h-px flex-1 bg-[#ded8dc]" />
        </div>

        <form onSubmit={submitEmail} className="space-y-5">
          <label className="block text-[10px] font-black tracking-[0.08em] text-[#625a61]">
            メールアドレス
            <span className="community-input mt-2 flex min-h-14 items-center gap-3 px-4">
              <Mail size={17} className="shrink-0 text-[#f43679]" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-[#1c171b] outline-none"
              />
            </span>
          </label>
          <label className="block text-[10px] font-black tracking-[0.08em] text-[#625a61]">
            パスワード
            <span className="community-input mt-2 flex min-h-14 items-center gap-3 px-4">
              <LockKeyhole size={17} className="shrink-0 text-[#f43679]" />
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-[#1c171b] outline-none"
              />
            </span>
            {mode === "signup" && <span className="mt-2 block font-medium tracking-normal text-[#958d93]">8文字以上で設定してください</span>}
          </label>

          {error && <p className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[11px] font-bold text-red-700">{error}</p>}
          {message && <p className="border-l-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-[11px] font-bold text-emerald-800">{message}</p>}

          <button
            type="submit"
            disabled={busy}
            className="community-primary-button min-h-14 w-full disabled:opacity-60"
          >
            {busy ? "処理中..." : mode === "login" ? "ログイン" : "アカウントを作る"}
          </button>
        </form>

        {mode === "login" && (
          <button type="button" onClick={resetPassword} className="zr-focus mt-5 min-h-11 w-full text-center text-[11px] font-black text-[#625a61]">
            パスワードを忘れた方
          </button>
        )}

        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}
          className="community-secondary-button mt-5 w-full"
        >
          {mode === "login" ? "メールアドレスで新規登録" : "すでにアカウントをお持ちの方"}
        </button>

        <p className="mt-8 text-center text-[9px] font-medium leading-5 text-[#958d93]">
          続行すると<Link href="/terms" className="underline">利用規約</Link>と<Link href="/privacy" className="underline">プライバシーポリシー</Link>に同意したものとみなされます。
        </p>
      </div>
    </main>
  );
}
