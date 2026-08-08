"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";

type FavoriteArtistButtonProps = {
  artistSlug: string;
  initialUserId?: string | null;
  initialFavorite?: boolean;
  className?: string;
  onChange?: (favorite: boolean) => void;
};

type FavoriteChangeDetail = {
  artistSlug: string;
  favorite: boolean;
};

const FAVORITE_CHANGE_EVENT = "tixrepo:favorite-change";

export default function FavoriteArtistButton({
  artistSlug,
  initialUserId,
  initialFavorite = false,
  className = "",
  onChange,
}: FavoriteArtistButtonProps) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(initialUserId ?? null);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialUserId !== undefined) return;

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
  }, [artistSlug, initialUserId]);

  useEffect(() => {
    function syncFavorite(event: Event) {
      const detail = (event as CustomEvent<FavoriteChangeDetail>).detail;
      if (detail.artistSlug === artistSlug) setFavorite(detail.favorite);
    }
    window.addEventListener(FAVORITE_CHANGE_EVENT, syncFavorite);
    return () => window.removeEventListener(FAVORITE_CHANGE_EVENT, syncFavorite);
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
      trackEvent(nextFavorite ? "favorite_artist_add" : "favorite_artist_remove", {
        artist_slug: artistSlug,
      });
      window.dispatchEvent(new CustomEvent<FavoriteChangeDetail>(FAVORITE_CHANGE_EVENT, {
        detail: { artistSlug, favorite: nextFavorite },
      }));
      onChange?.(nextFavorite);
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={favorite ? "推し登録を解除" : "推しに登録"}
      aria-pressed={favorite}
      title={favorite ? "推し登録を解除" : "推しに登録"}
      className={`zr-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors disabled:opacity-60 ${
        favorite
          ? "border-[#FF6B9D] bg-[#FF6B9D] text-white"
          : "border-pink-100 bg-white/95 text-[#FF6B9D]"
      } ${className}`}
    >
      <Heart size={18} strokeWidth={1.8} fill={favorite ? "currentColor" : "none"} />
    </button>
  );
}
