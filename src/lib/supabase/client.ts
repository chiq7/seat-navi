import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// The SSR browser client uses the PKCE flow and cookie storage expected by the
// server-side /auth/callback route.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
