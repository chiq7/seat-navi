import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Server-side Supabase client (service role key でRLSをバイパス) */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  return createSupabaseClient(url, key);
}
