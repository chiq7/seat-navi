-- Xの公開座席投稿に限り、承認済みのスタンド・階層席も公開読み取りを許可する。
-- 転売サイト等（source_type が other 以外、または X 以外のURL）のスタンド席は引き続き非公開。
-- 元に戻す場合:
--   alter policy "公開済みアリーナ外部席情報を閲覧できる" on public.external_seat_observations
--     using (review_status = 'approved' and seat_area = 'arena');
alter policy "公開済みアリーナ外部席情報を閲覧できる"
  on public.external_seat_observations
  using (
    review_status = 'approved'
    and (
      seat_area = 'arena'
      or (
        seat_area = 'stand'
        and source_type = 'other'
        and source_url like 'https://x.com/i/web/status/%'
      )
    )
  );
