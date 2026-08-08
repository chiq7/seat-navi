"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart, LogOut, Save, UserRound } from "lucide-react";
import { MyPostsSection, type OwnedSeatPrediction } from "@/components/mypage/MyPostsSection";
import { PersonalTicketStats } from "@/components/mypage/PersonalTicketStats";
import { findArtistBySlug } from "@/lib/artists";
import type { AfterReportCard, TicketResultAnalytics } from "@/lib/artistPageTypes";
import type { PostAuthor } from "@/lib/postAuthors";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent, FanSeatPrediction } from "@/lib/types";

const TICKET_COLUMNS = "id, event_id, user_id, result, lost_application_count, ticket_count, lottery_type, fc_history, payment_method, seat_type, upgrade_result, comment, seat_block, seat_row, seat_number, stand_direction, stand_floor, other_seat_info, created_at";
const LIVE_COLUMNS = "id, event_id, user_id, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths, main_stage, center_stage, fansa_rating, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at";
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
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const authorMap = useMemo(() => {
    const map = new Map<string, PostAuthor>();
    if (userId) {
      map.set(userId, { id: userId, ...profile });
    }
    return map;
  }, [profile, userId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        if (!cancelled) {
          setLoadError("ログイン情報を確認できませんでした。通信環境を確認して再試行してください。");
          setLoading(false);
        }
        return;
      }
      if (!sessionData.session) {
        router.replace("/login?next=/mypage");
        return;
      }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        if (!cancelled) {
          setLoadError("ログイン情報を確認できませんでした。通信環境を確認して再試行してください。");
          setLoading(false);
        }
        return;
      }
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

      const firstError = [profileRes.error, favoriteRes.error, ticketRes.error, predictionRes.error, liveRes.error].find(Boolean);
      if (firstError) {
        setLoadError("マイページのデータを読み込めませんでした。少し待ってから再試行してください。");
        setLoading(false);
        return;
      }

      if (profileRes.data) setProfile(profileRes.data as Profile);
      setFavorites((favoriteRes.data ?? []).map((row: { artist_slug: string }) => row.artist_slug));
      const tickets = (ticketRes.data ?? []) as TicketResultAnalytics[];
      const rawPredictions = (predictionRes.data ?? []) as FanSeatPrediction[];
      const lives = (liveRes.data ?? []) as AfterReportCard[];
      setTicketPosts(tickets);
      setLivePosts(lives);

      const voteCounts = new Map<string, number>();
      if (rawPredictions.length > 0) {
        const { data: votes, error: voteError } = await supabase
          .from("fan_seat_prediction_votes")
          .select("prediction_id")
          .in("prediction_id", rawPredictions.map((prediction) => prediction.id));
        if (voteError) {
          if (!cancelled) {
            setLoadError("投稿データの一部を読み込めませんでした。再試行してください。");
            setLoading(false);
          }
          return;
        }
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
        const { data: events, error: eventError } = await supabase
          .from("events")
          .select("id, title, venue, date, artist_slug")
          .in("id", eventIds);
        if (eventError) {
          if (!cancelled) {
            setLoadError("公演情報を読み込めませんでした。再試行してください。");
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setEventMap(new Map(((events ?? []) as CrawledEvent[]).map((event) => [event.id, event])));
        }
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [router, reloadKey]);

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

  async function updateTicket(id: string, comment: string) {
    if (!userId) return { error: "ログイン情報を確認できません。" };
    const value = comment || null;
    const { data, error } = await supabase
      .from("event_ticket_results")
      .update({ comment: value })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "当落レポを保存できませんでした。" };
    setTicketPosts((items) => items.map((item) => item.id === id ? { ...item, comment: value } : item));
    return {};
  }

  async function deleteTicket(id: string) {
    if (!userId) return { error: "ログイン情報を確認できません。" };
    const { data, error } = await supabase
      .from("event_ticket_results")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "当落レポを削除できませんでした。" };
    setTicketPosts((items) => items.filter((item) => item.id !== id));
    return {};
  }

  async function updatePrediction(id: string, comment: string) {
    if (!userId) return { error: "ログイン情報を確認できません。" };
    const value = comment || null;
    const { data, error } = await supabase
      .from("fan_seat_predictions")
      .update({ comment: value })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "座席予想を保存できませんでした。" };
    setPredictions((items) => items.map((item) => item.id === id ? { ...item, comment: value } : item));
    return {};
  }

  async function deletePrediction(prediction: OwnedSeatPrediction) {
    if (!userId) return { error: "ログイン情報を確認できません。" };
    const { data, error } = await supabase
      .from("fan_seat_predictions")
      .delete()
      .eq("id", prediction.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "座席予想を削除できませんでした。" };
    setPredictions((items) => items.filter((item) => item.id !== prediction.id));
    const { error: storageError } = await supabase.storage.from("fan-seat-predictions").remove([prediction.image_path]);
    return storageError ? { warning: "投稿は削除しましたが、画像の整理に失敗しました。" } : {};
  }

  async function updateLive(id: string, memo: string) {
    if (!userId) return { error: "ログイン情報を確認できません。" };
    const value = memo || null;
    const { data, error } = await supabase
      .from("after_reports")
      .update({ memo: value })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "現地レポを保存できませんでした。" };
    setLivePosts((items) => items.map((item) => item.id === id ? { ...item, memo: value } : item));
    return {};
  }

  async function deleteLive(id: string) {
    if (!userId) return { error: "ログイン情報を確認できません。" };
    const { data, error } = await supabase
      .from("after_reports")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { error: "現地レポを削除できませんでした。" };
    setLivePosts((items) => items.filter((item) => item.id !== id));
    return {};
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" /></div>;
  }

  if (loadError) {
    return (
      <main className="community-page">
        <header className="community-hero">
          <div className="zr-container flex h-16 items-center">
            <Link href="/" aria-label="TOPへ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2b252b] shadow-sm"><ChevronLeft size={26} /></Link>
          </div>
        </header>
        <div className="zr-container pt-12 text-center">
          <div className="border border-red-200 bg-white px-5 py-10">
            <p className="text-[16px] font-black">読み込みに失敗しました</p>
            <p className="mt-2 text-[11px] font-medium leading-6 text-[#817981]">{loadError}</p>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="zr-focus mt-6 min-h-12 bg-[#f43679] px-7 text-[12px] font-black text-white"
            >
              再試行する
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="community-page pb-16">
      <section className="community-hero">
        <header className="zr-container flex h-16 items-center">
          <Link
            href="/"
            aria-label="TOPへ戻る"
            className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2b252b] shadow-sm"
          >
            <ChevronLeft size={26} strokeWidth={2.7} />
          </Link>
        </header>
        <div className="zr-container pb-10 pt-5 sm:pb-14 sm:pt-9">
          <p className="community-eyebrow">MY TIXREPO</p>
          <h1 className="community-title mt-3">ライブの記録を、<br /><span className="text-[#ef4f87]">自分だけの一冊に。</span></h1>
          <div className="mt-7 grid rounded-[22px] border border-white/80 bg-white/72 px-4 shadow-sm backdrop-blur-sm sm:grid-cols-[1fr_180px]">
            <div className="flex min-w-0 items-center gap-3 py-4 sm:border-r sm:border-[#eadfe4] sm:pr-5">
              <UserRound size={19} className="shrink-0 text-[#ef4f87]" />
              <div className="min-w-0">
                <p className="text-[9px] font-black tracking-[0.13em] text-[#958d93]">SIGNED IN</p>
                <p className="mt-1 truncate text-[14px] font-black">{profile.display_name || email}</p>
              </div>
            </div>
            <div className="flex items-end justify-between border-t border-[#eadfe4] py-4 sm:border-t-0 sm:pl-5">
              <p className="text-[9px] font-black tracking-[0.13em] text-[#958d93]">TOTAL POSTS</p>
              <p className="text-[30px] font-black text-[#ef4f87]">{ticketPosts.length + predictions.length + livePosts.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="zr-container space-y-10 py-10 sm:space-y-14 sm:py-14">

        <PersonalTicketStats ticketPosts={ticketPosts} eventMap={eventMap} displayName={profile.display_name} />

        <section className="pb-10 sm:pb-14" aria-labelledby="favorite-artists-title">
          <p className="artist-kicker">Favorite Artists</p>
          <div className="mt-2 flex items-center gap-2"><Heart size={19} className="text-[#f43679]" /><h2 id="favorite-artists-title" className="text-[25px] font-black tracking-[-0.04em]">推しアーティスト</h2></div>
          {favorites.length === 0 ? (
            <p className="community-panel mt-5 px-4 py-8 text-center text-[11px] font-bold text-[#958d93]">アーティストページの「推しに登録」から追加できます。</p>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((slug) => (
                <div key={slug} className="community-card flex min-h-16 items-center justify-between gap-3 px-4">
                  <Link href={`/artists/${slug}`} className="zr-focus min-w-0 truncate text-[13px] font-black">{findArtistBySlug(slug)?.name ?? slug}</Link>
                  <button type="button" onClick={() => removeFavorite(slug)} className="zr-focus min-h-11 shrink-0 text-[10px] font-black text-[#958d93]">解除</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <MyPostsSection
          ticketPosts={ticketPosts}
          predictions={predictions}
          livePosts={livePosts}
          eventMap={eventMap}
          authorMap={authorMap}
          onUpdateTicket={updateTicket}
          onDeleteTicket={deleteTicket}
          onUpdatePrediction={updatePrediction}
          onDeletePrediction={deletePrediction}
          onUpdateLive={updateLive}
          onDeleteLive={deleteLive}
        />

        <section className="pb-10 sm:pb-14" aria-labelledby="profile-title">
          <p className="artist-kicker">Profile &amp; X</p>
          <h2 id="profile-title" className="artist-heading">プロフィール・X</h2>
          <p className="mt-3 text-[11px] font-medium leading-6 text-[#817981]">表示を許可した投稿からXプロフィールへ移動できるようになります。</p>
          <div className="community-panel mt-6 p-4 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-[10px] font-black text-[#625a61]">表示名<input value={profile.display_name ?? ""} maxLength={40} onChange={(event) => setProfile((value) => ({ ...value, display_name: event.target.value }))} className="zr-focus mt-2 h-12 w-full border border-[#cfc8cc] px-3 text-[13px] font-bold outline-none focus:border-[#f43679]" placeholder="投稿で表示する名前" /></label>
              <label className="block text-[10px] font-black text-[#625a61]">Xユーザー名<input value={profile.x_handle ?? ""} maxLength={16} onChange={(event) => setProfile((value) => ({ ...value, x_handle: event.target.value }))} className="zr-focus mt-2 h-12 w-full border border-[#cfc8cc] px-3 text-[13px] font-bold outline-none focus:border-[#f43679]" placeholder="@を除いたユーザー名" /></label>
            </div>
            <label className="mt-5 flex min-h-11 items-center gap-3 text-[11px] font-bold text-[#625a61]"><input type="checkbox" checked={profile.show_x_on_posts} onChange={(event) => setProfile((value) => ({ ...value, show_x_on_posts: event.target.checked }))} className="h-5 w-5 accent-[#f43679]" />投稿にXアカウントを表示する</label>
            {message && <p className="mt-3 border-l-2 border-[#f43679] bg-[#fff0f5] px-3 py-2 text-[10px] font-bold text-[#625a61]">{message}</p>}
            <button type="button" onClick={saveProfile} disabled={saving} className="zr-focus mt-5 flex min-h-13 w-full items-center justify-center gap-2 bg-[#f43679] text-[12px] font-black text-white disabled:opacity-60"><Save size={15} />{saving ? "保存中..." : "プロフィールを保存"}</button>
          </div>
        </section>

        <button type="button" onClick={logout} className="zr-focus flex min-h-13 w-full items-center justify-center gap-2 border border-[#cfc8cc] bg-white text-[12px] font-black text-[#625a61]"><LogOut size={15} />ログアウト</button>
      </div>
    </main>
  );
}
