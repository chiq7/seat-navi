"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Heart, LogOut } from "lucide-react";
import { Header } from "@/components/common/Header";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";

type TicketPost = { id: string; event_id: string; result: "won" | "lost"; created_at: string };
type LivePost = { id: string; event_id: string; created_at: string };
type Profile = { display_name: string | null; x_handle: string | null; show_x_on_posts: boolean };
type EventLabel = { id: string; title: string; venue: string; date: string | null; artist_slug: string | null };

export default function MyPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile>({ display_name: "", x_handle: "", show_x_on_posts: false });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ticketPosts, setTicketPosts] = useState<TicketPost[]>([]);
  const [livePosts, setLivePosts] = useState<LivePost[]>([]);
  const [eventMap, setEventMap] = useState<Map<string, EventLabel>>(new Map());
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

      const [profileRes, favoriteRes, ticketRes, liveRes] = await Promise.all([
        supabase.from("profiles").select("display_name, x_handle, show_x_on_posts").eq("id", user.id).maybeSingle(),
        supabase.from("favorite_artists").select("artist_slug").eq("user_id", user.id).order("created_at"),
        supabase.from("event_ticket_results").select("id, event_id, result, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("after_reports").select("id, event_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      ]);
      if (cancelled) return;

      if (profileRes.data) setProfile(profileRes.data as Profile);
      setFavorites((favoriteRes.data ?? []).map((row: { artist_slug: string }) => row.artist_slug));
      const tickets = (ticketRes.data ?? []) as TicketPost[];
      const lives = (liveRes.data ?? []) as LivePost[];
      setTicketPosts(tickets);
      setLivePosts(lives);

      const eventIds = [...new Set([...tickets, ...lives].map((post) => post.event_id))];
      if (eventIds.length > 0) {
        const { data: events } = await supabase.from("events").select("id, title, venue, date, artist_slug").in("id", eventIds);
        if (!cancelled) setEventMap(new Map(((events ?? []) as EventLabel[]).map((event) => [event.id, event])));
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  const winStats = useMemo(() => {
    const won = ticketPosts.filter((post) => post.result === "won").length;
    return { won, total: ticketPosts.length, rate: ticketPosts.length ? Math.round((won / ticketPosts.length) * 100) : null };
  }, [ticketPosts]);

  const history = useMemo(() => [
    ...ticketPosts.map((post) => ({ ...post, kind: "当落レポ" as const, href: `/events/${post.event_id}` })),
    ...livePosts.map((post) => ({ ...post, kind: "現地レポ" as const, href: `/report/live/detail?reportId=${post.id}` })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)), [ticketPosts, livePosts]);

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

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" /></div>;

  return (
    <main className="min-h-screen bg-[#FFF8FB] pb-10">
      <Header title="マイページ" backHref="/" />
      <div className="space-y-4 px-3 pt-3">
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] text-gray-400">ログイン中</p>
          <p className="mt-1 truncate text-[13px] font-bold text-gray-800">{email}</p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-[9px] text-gray-400">総合当選率</p><p className="mt-1 text-xl font-extrabold text-[#FF6B9D]">{winStats.rate === null ? "--" : `${winStats.rate}%`}</p></div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-[9px] text-gray-400">当選</p><p className="mt-1 text-xl font-extrabold text-gray-800">{winStats.won}</p></div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-[9px] text-gray-400">投稿</p><p className="mt-1 text-xl font-extrabold text-gray-800">{history.length}</p></div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-[14px] font-bold text-gray-900">プロフィール・X</h2>
          <label className="mt-4 block text-[10px] font-bold text-gray-600">表示名<input value={profile.display_name ?? ""} maxLength={40} onChange={(event) => setProfile((value) => ({ ...value, display_name: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-[12px] outline-none focus:border-[#FF6B9D]" placeholder="投稿で表示する名前" /></label>
          <label className="mt-3 block text-[10px] font-bold text-gray-600">Xユーザー名<input value={profile.x_handle ?? ""} maxLength={16} onChange={(event) => setProfile((value) => ({ ...value, x_handle: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-[12px] outline-none focus:border-[#FF6B9D]" placeholder="@を除いたユーザー名" /></label>
          <label className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-gray-700"><input type="checkbox" checked={profile.show_x_on_posts} onChange={(event) => setProfile((value) => ({ ...value, show_x_on_posts: event.target.checked }))} className="h-4 w-4 accent-[#FF6B9D]" />投稿にXアカウントを表示する</label>
          {message && <p className="mt-3 text-[10px] text-gray-500">{message}</p>}
          <button type="button" onClick={saveProfile} disabled={saving} className="mt-4 h-10 w-full rounded-full bg-[#FF6B9D] text-[12px] font-bold text-white disabled:opacity-60">{saving ? "保存中..." : "プロフィールを保存"}</button>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2"><Heart size={16} className="text-[#FF6B9D]" /><h2 className="text-[14px] font-bold text-gray-900">推しアーティスト</h2></div>
          {favorites.length === 0 ? <p className="mt-4 text-[11px] text-gray-400">アーティストページの「推しに登録」から追加できます。</p> : <div className="mt-3 space-y-2">{favorites.map((slug) => <div key={slug} className="flex items-center justify-between rounded-xl bg-[#FFF8FB] px-3 py-2"><Link href={`/artists/${slug}`} className="text-[12px] font-bold text-gray-800">{findArtistBySlug(slug)?.name ?? slug}</Link><button type="button" onClick={() => removeFavorite(slug)} className="text-[10px] font-semibold text-gray-400">解除</button></div>)}</div>}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-[14px] font-bold text-gray-900">自分の投稿履歴</h2>
          {history.length === 0 ? <p className="mt-4 text-[11px] text-gray-400">ログイン中に投稿したレポがここに表示されます。</p> : <div className="mt-3 divide-y divide-gray-100">{history.map((post) => { const event = eventMap.get(post.event_id); return <Link key={`${post.kind}-${post.id}`} href={post.href} className="flex items-center justify-between py-3 no-underline"><div className="min-w-0"><p className="text-[10px] font-bold text-[#FF6B9D]">{post.kind}</p><p className="mt-0.5 truncate text-[12px] font-bold text-gray-800">{event?.title ?? "公演"}</p><p className="mt-0.5 text-[9px] text-gray-400">{event?.date ?? "日付不明"}・{event?.venue ?? "会場不明"}</p></div><ExternalLink size={14} className="shrink-0 text-gray-300" /></Link>; })}</div>}
        </section>

        <button type="button" onClick={logout} className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white text-[12px] font-bold text-gray-600"><LogOut size={15} />ログアウト</button>
      </div>
    </main>
  );
}
