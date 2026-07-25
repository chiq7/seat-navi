"use client";

import { Suspense, type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Header } from "@/components/common/Header";

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
    setBusy(true);
    setError("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (authError) {
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
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (authError) setError(authError.message);
      else if (data.session) router.replace(next);
      else setMessage("確認メールを送りました。メール内のリンクを押すと登録が完了します。");
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError("メールアドレスかパスワードが正しくありません。");
      else router.replace(next);
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
    else setMessage("パスワード再設定メールを送りました。");
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#FFF8FB] pb-10">
      <Header title={mode === "login" ? "ログイン" : "新規登録"} backHref="/" showAccount={false} />
      <div className="mx-auto max-w-sm px-5 pt-8">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white text-[13px] font-bold text-gray-800 shadow-sm disabled:opacity-60"
        >
          <span className="text-lg font-bold text-[#4285F4]">G</span>
          Googleで続ける
        </button>

        <div className="my-6 flex items-center gap-3 text-[10px] text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />または<div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={submitEmail} className="space-y-4">
          <label className="block text-[11px] font-bold text-gray-700">
            メールアドレス
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-[13px] outline-none focus:border-[#FF6B9D]"
            />
          </label>
          <label className="block text-[11px] font-bold text-gray-700">
            パスワード
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-[13px] outline-none focus:border-[#FF6B9D]"
            />
            {mode === "signup" && <span className="mt-1 block font-normal text-gray-400">8文字以上で設定してください</span>}
          </label>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2.5 text-[11px] text-red-600">{error}</p>}
          {message && <p className="rounded-xl bg-green-50 px-3 py-2.5 text-[11px] text-green-700">{message}</p>}

          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-full bg-[#FF6B9D] text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,107,157,0.25)] disabled:opacity-60"
          >
            {busy ? "処理中..." : mode === "login" ? "ログイン" : "アカウントを作る"}
          </button>
        </form>

        {mode === "login" && (
          <button type="button" onClick={resetPassword} className="mt-4 w-full text-center text-[11px] font-semibold text-gray-500">
            パスワードを忘れた方
          </button>
        )}

        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}
          className="mt-7 w-full text-center text-[12px] font-bold text-[#FF6B9D]"
        >
          {mode === "login" ? "メールアドレスで新規登録" : "すでにアカウントをお持ちの方"}
        </button>

        <p className="mt-8 text-center text-[9px] leading-relaxed text-gray-400">
          続行すると<Link href="/terms" className="underline">利用規約</Link>と<Link href="/privacy" className="underline">プライバシーポリシー</Link>に同意したものとみなされます。
        </p>
      </div>
    </main>
  );
}
