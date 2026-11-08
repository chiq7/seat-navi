import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseSessionCookie } from "./sessionCookie";

export async function createSupabaseServerClient({ requireSession = false } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  const cookieStore = await cookies();
  if (requireSession && !hasSupabaseSessionCookie(url, cookieStore)) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always write cookies. src/proxy.ts refreshes them.
        }
      },
    },
  });
}
