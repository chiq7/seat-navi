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
