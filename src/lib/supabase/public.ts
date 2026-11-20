import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let publicClient: SupabaseClient | null | undefined;

/** Cookieやログイン状態を持たない、公開読み取り専用のサーバークライアント。 */
export function createSupabasePublicClient(signal?: AbortSignal): SupabaseClient | null {
  if (!signal && publicClient !== undefined) return publicClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    publicClient = null;
    return publicClient;
  }

  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    ...(signal ? { global: { fetch: (input, init) => fetch(input, { ...init, signal }) } } : {}),
  });
  if (!signal) publicClient = client;
  return client;
}
