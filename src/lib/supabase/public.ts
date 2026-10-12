import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let publicClient: SupabaseClient | null | undefined;

/** Cookieやログイン状態を持たない、公開読み取り専用のサーバークライアント。 */
export function createSupabasePublicClient(): SupabaseClient | null {
  if (publicClient !== undefined) return publicClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    publicClient = null;
    return publicClient;
  }

  publicClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return publicClient;
}
