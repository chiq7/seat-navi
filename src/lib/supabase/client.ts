import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// The SSR browser client uses the PKCE flow and cookie storage expected by the
// server-side /auth/callback route.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// 投稿者を紐付けない公開投稿は、ログイン中のセッションを引き継がない。
// after_reports の匿名 RLS ポリシーで送信するためのクライアント。
export const anonymousSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

/**
 * 投稿時のログイン状態を確定し、RLS に合うクライアントと user_id を返す。
 * 未ログインなら従来どおり匿名投稿を許可し、ログイン中なら投稿を本人に紐付ける。
 */
export async function getPostingContext() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (!sessionData.session) {
    return { client: anonymousSupabase, userId: null };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("ログイン情報を確認できませんでした。");

  return { client: supabase, userId: userData.user.id };
}
