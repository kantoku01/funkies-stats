-- 試合予定: 試合に「予定 / 終了」の状態と、開始・集合時間、場所、ユニフォームの色、ベース持参を持たせる。
--   予定の試合はスコアと勝敗を持たない。成績・勝敗に数えるのは終了した試合だけ(アプリ側)。
--   これまでの試合はすべて終了として扱う。

alter table public.games
  add column status      text not null default 'completed' check (status in ('scheduled', 'completed')),
  add column start_time  time,
  add column meet_time   time,
  add column venue       text check (venue is null or length(venue) <= 60),
  add column uniform     text check (uniform is null or length(uniform) <= 30),
  add column bring_bases boolean; -- ベース持参: true = 必要 / false = 不要 / null = 未定

alter table public.games alter column result drop not null;
alter table public.games add constraint games_status_result check (
  (status = 'completed' and result is not null) or
  (status = 'scheduled' and result is null and team_score is null and opponent_score is null)
);
create index games_status_date_idx on public.games (status, game_date);
