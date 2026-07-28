"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";

export default function FavoriteArtistButton({ artistSlug }: { artistSlug: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      if (cancelled) return;
      setUserId(id);
      if (!id) return;
      const { data: row } = await supabase
        .from("favorite_artists")
        .select("artist_slug")
        .eq("user_id", id)
        .eq("artist_slug", artistSlug)
        .maybeSingle();
      if (!cancelled) setFavorite(Boolean(row));
    });
    return () => { cancelled = true; };
  }, [artistSlug]);

  async function toggle() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(`/artists/${artistSlug}`)}`);
      return;
    }
    setBusy(true);
    const query = favorite
      ? supabase.from("favorite_artists").delete().eq("user_id", userId).eq("artist_slug", artistSlug)
      : supabase.from("favorite_artists").insert({ user_id: userId, artist_slug: artistSlug });
    const { error } = await query;
    if (!error) {
      const nextFavorite = !favorite;
      setFavorite(nextFavorite);
      trackEvent("favorite_artist", {
        action: nextFavorite ? "add" : "remove",
        artist_slug: artistSlug,
      });
    }
    setBusy(false);
  }

  return (
    <div className="flex justify-end px-3 pt-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors disabled:opacity-60 ${favorite ? "border-[#FF6B9D] bg-[#FFF1F6] text-[#FF6B9D]" : "border-gray-200 bg-white text-gray-600"}`}
      >
        <Heart size={15} fill={favorite ? "currentColor" : "none"} />
        {favorite ? "推し登録済み" : "推しに登録"}
      </button>
    </div>
  );
}
