"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LogOut } from "lucide-react";
import { Header } from "@/components/common/Header";
import { MyPostsSection, type OwnedSeatPrediction } from "@/components/mypage/MyPostsSection";
import { PersonalTicketStats } from "@/components/mypage/PersonalTicketStats";
import { findArtistBySlug } from "@/lib/artists";
import type { AfterReportCard, TicketResultAnalytics } from "@/lib/artistPageTypes";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent, FanSeatPrediction } from "@/lib/types";

const TICKET_COLUMNS = "id, event_id, result, lost_application_count, ticket_count, lottery_type, fc_history, payment_method, seat_type, upgrade_result, comment, seat_block, seat_row, seat_number, stand_direction, stand_floor, other_seat_info, created_at";
const LIVE_COLUMNS = "id, event_id, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths, main_stage, center_stage, fansa_rating, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at";
const PREDICTION_COLUMNS = "id, event_id, user_id, image_path, comment, prediction_tags, display_name, approved, created_at";

type Profile = { display_name: string | null; x_handle: string | null; show_x_on_posts: boolean };

export default function MyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({ display_name: "", x_handle: "", show_x_on_posts: false });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ticketPosts, setTicketPosts] = useState<TicketResultAnalytics[]>([]);
  const [predictions, setPredictions] = useState<OwnedSeatPrediction[]>([]);
  const [livePosts, setLivePosts] = useState<AfterReportCard[]>([]);
  const [eventMap, setEventMap] = useState<Map<string, CrawledEvent>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        router.replace("/login?next=/mypage");
        return;
      }
      if (cancelled) return;
      setUserId(user.id);
      setEmail(user.email ?? "");

      const [profileRes, favoriteRes, ticketRes, predictionRes, liveRes] = await Promise.all([
        supabase.from("profiles").select("display_name, x_handle, show_x_on_posts").eq("id", user.id).maybeSingle(),
        supabase.from("favorite_artists").select("artist_slug").eq("user_id", user.id).order("created_at"),
        supabase.from("event_ticket_results").select(TICKET_COLUMNS).eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("fan_seat_predictions").select(PREDICTION_COLUMNS).eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("after_reports").select(LIVE_COLUMNS).eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      ]);
      if (cancelled) return;

      if (profileRes.data) setProfile(profileRes.data as Profile);
      setFavorites((favoriteRes.data ?? []).map((row: { artist_slug: string }) => row.artist_slug));
      const tickets = (ticketRes.data ?? []) as TicketResultAnalytics[];
      const rawPredictions = (predictionRes.data ?? []) as FanSeatPrediction[];
      const lives = (liveRes.data ?? []) as AfterReportCard[];
      setTicketPosts(tickets);
      setLivePosts(lives);

      const voteCounts = new Map<string, number>();
      if (rawPredictions.length > 0) {
        const { data: votes } = await supabase
          .from("fan_seat_prediction_votes")
          .select("prediction_id")
          .in("prediction_id", rawPredictions.map((prediction) => prediction.id));
        (votes ?? []).forEach((vote: { prediction_id: string }) => {
          voteCounts.set(vote.prediction_id, (voteCounts.get(vote.prediction_id) ?? 0) + 1);
        });
      }
      const ownedPredictions = rawPredictions.map((prediction) => ({
        ...prediction,
        imageUrl: supabase.storage.from("fan-seat-predictions").getPublicUrl(prediction.image_path).data.publicUrl,
        voteCount: voteCounts.get(prediction.id) ?? 0,
      }));
      if (!cancelled) setPredictions(ownedPredictions);

      const eventIds = [...new Set([
        ...tickets.map((post) => post.event_id),
        ...rawPredictions.map((post) => post.event_id),
        ...lives.map((post) => post.event_id),
      ])];
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from("events")
          .select("id, title, venue, date, artist_slug")
          .in("id", eventIds);
        if (!cancelled) {
          setEventMap(new Map(((events ?? []) as CrawledEvent[]).map((event) => [event.id, event])));
        }
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  async function saveProfile() {
    if (!userId) return;
    setSaving(true);
    setMessage("");
    const handle = profile.x_handle?.trim().replace(/^@/, "") || null;
    if (handle && !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
      setMessage("Xのユーザー名は英数字と_の15文字以内で入力してください。");
      setSaving(false);
      return;
    }
    const displayName = profile.display_name?.trim() || null;
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName,
      x_handle: handle,
      show_x_on_posts: Boolean(handle && profile.show_x_on_posts),
      updated_at: new Date().toISOString(),
    });
    setProfile({ display_name: displayName, x_handle: handle, show_x_on_posts: Boolean(handle && profile.show_x_on_posts) });
    setMessage(error ? error.message : "プロフィールを保存しました。");
    setSaving(false);
  }

  async function removeFavorite(slug: string) {
    if (!userId) return;
    const { error } = await supabase.from("favorite_artists").delete().eq("user_id", userId).eq("artist_slug", slug);
    if (!error) setFavorites((items) => items.filter((item) => item !== slug));
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" /></div>;
  }

  return (
    <main className="min-h-screen bg-[#FFF8FB] pb-10">
      <Header title="マイページ" backHref="/" />
      <div className="space-y-4 px-3 pt-3">
        <section className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400">ログイン中</p>
            <p className="mt-1 truncate text-[13px] font-bold text-gray-800">{profile.display_name || email}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-extrabold text-[#FF6B9D]">{ticketPosts.length + predictions.length + livePosts.length}</p>
            <p className="text-[8px] text-gray-400">総投稿数</p>
          </div>
        </section>

        <PersonalTicketStats ticketPosts={ticketPosts} eventMap={eventMap} displayName={profile.display_name} />

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><Heart size={16} className="text-[#FF6B9D]" /><h2 className="text-[14px] font-bold text-gray-900">推しアーティスト</h2></div>
          {favorites.length === 0 ? (
            <p className="mt-4 text-[11px] text-gray-400">アーティストページの「推しに登録」から追加できます。</p>
          ) : (
            <div className="mt-3 space-y-2">
              {favorites.map((slug) => (
                <div key={slug} className="flex items-center justify-between rounded-xl bg-[#FFF8FB] px-3 py-2">
                  <Link href={`/artists/${slug}`} className="text-[12px] font-bold text-gray-800">{findArtistBySlug(slug)?.name ?? slug}</Link>
                  <button type="button" onClick={() => removeFavorite(slug)} className="text-[10px] font-semibold text-gray-400">解除</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <MyPostsSection ticketPosts={ticketPosts} predictions={predictions} livePosts={livePosts} eventMap={eventMap} />

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-[14px] font-bold text-gray-900">プロフィール・X</h2>
          <p className="mt-1 text-[10px] text-gray-400">表示を許可した投稿からXプロフィールへ移動できるようになります。</p>
          <label className="mt-4 block text-[10px] font-bold text-gray-600">表示名<input value={profile.display_name ?? ""} maxLength={40} onChange={(event) => setProfile((value) => ({ ...value, display_name: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-[12px] outline-none focus:border-[#FF6B9D]" placeholder="投稿で表示する名前" /></label>
          <label className="mt-3 block text-[10px] font-bold text-gray-600">Xユーザー名<input value={profile.x_handle ?? ""} maxLength={16} onChange={(event) => setProfile((value) => ({ ...value, x_handle: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-[12px] outline-none focus:border-[#FF6B9D]" placeholder="@を除いたユーザー名" /></label>
          <label className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-gray-700"><input type="checkbox" checked={profile.show_x_on_posts} onChange={(event) => setProfile((value) => ({ ...value, show_x_on_posts: event.target.checked }))} className="h-4 w-4 accent-[#FF6B9D]" />投稿にXアカウントを表示する</label>
          {message && <p className="mt-3 text-[10px] text-gray-500">{message}</p>}
          <button type="button" onClick={saveProfile} disabled={saving} className="mt-4 h-10 w-full rounded-full bg-[#FF6B9D] text-[12px] font-bold text-white disabled:opacity-60">{saving ? "保存中..." : "プロフィールを保存"}</button>
        </section>

        <button type="button" onClick={logout} className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white text-[12px] font-bold text-gray-600"><LogOut size={15} />ログアウト</button>
      </div>
    </main>
  );
}
