alter table public.fan_board_posts
  add column x_handle text
  check (x_handle is null or x_handle ~ '^[A-Za-z0-9_]{1,15}$');
