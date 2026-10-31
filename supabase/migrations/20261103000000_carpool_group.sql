-- 選手ごとの配車の属性: 配車グループA / 配車グループB / 個別。
--   試合前日の LINE の文面で、参加する選手をこの属性ごとに分けて並べる(未設定は個別に入れる)

alter table public.players
  add column carpool_group text check (carpool_group in ('A', 'B', 'individual'));
