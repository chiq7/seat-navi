drop policy if exists "public read opted-in profiles" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;

create policy "public read opted-in profiles"
  on public.profiles for select
  to anon
  using (show_x_on_posts = true);

create policy "authenticated read visible or own profiles"
  on public.profiles for select
  to authenticated
  using (show_x_on_posts = true or (select auth.uid()) = id);
