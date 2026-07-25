import { supabase } from "@/lib/supabase/client";

export type PostAuthor = {
  id: string;
  display_name: string | null;
  x_handle: string | null;
  show_x_on_posts: boolean;
};

export async function fetchVisiblePostAuthors(userIds: Array<string | null | undefined>) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map<string, PostAuthor>();

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, x_handle, show_x_on_posts")
    .in("id", ids)
    .eq("show_x_on_posts", true);
  return new Map(((data ?? []) as PostAuthor[]).map((author) => [author.id, author]));
}
