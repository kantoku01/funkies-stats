-- ファンキーズ打撃成績: テーブル定義
-- 保存するのは「誰が・どの試合で・何打席目に・どんな結果だったか」だけ。
-- 累計や率は持たず、アプリ側の計算関数 (src/lib/stats) で毎回求める。

-- 選手
create table public.players (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null check (length(trim(full_name)) > 0),
  kind       text not null check (kind in ('regular', 'guest')),
  joined_on  date,
  left_on    date,
  created_at timestamptz not null default now(),
  -- 正規メンバーは加入日が必須(選手の試合数の計算に使う)
  constraint players_regular_joined_on check (kind = 'guest' or joined_on is not null),
  constraint players_left_after_joined check (left_on is null or joined_on is null or left_on >= joined_on)
);

-- シーズン別背番号
-- 前シーズンからの引き継ぎは「そのシーズン以前で最新の行」を表示することで実現し、行のコピーはしない
create table public.season_numbers (
  season    int  not null check (season between 2000 and 2100),
  player_id uuid not null references public.players (id) on delete cascade,
  number    text not null check (number ~ '^[0-9]{1,3}$'), -- "0" と "00" を区別するため文字列
  primary key (season, player_id),
  unique (season, number)
);

-- 試合
create table public.games (
  id             uuid primary key default gen_random_uuid(),
  game_date      date not null,
  season         int generated always as (extract(year from game_date)::int) stored,
  opponent       text,
  team_score     int check (team_score >= 0),
  opponent_score int check (opponent_score >= 0),
  result         text not null check (result in ('win', 'lose', 'draw')),
  memo           text,
  created_at     timestamptz not null default now()
);
create index games_season_date_idx on public.games (season, game_date desc);

-- 参加者
-- 選手の削除は、試合の記録があると止める(辞めた選手は退団日で扱う)
create table public.game_participants (
  game_id            uuid not null references public.games (id) on delete cascade,
  player_id          uuid not null references public.players (id) on delete restrict,
  batting_order      int check (batting_order between 1 and 30),
  extra_stolen_bases int not null default 0 check (extra_stolen_bases between 0 and 3), -- 打席外の盗塁(代走など)
  primary key (game_id, player_id)
);
create index game_participants_player_idx on public.game_participants (player_id);

-- 打席
-- 参加者を外すと、その選手の打席も連動して消える
create table public.plate_appearances (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null,
  player_id    uuid not null,
  seq          int  not null check (seq >= 1),
  result       text not null check (result in (
                 'single', 'double', 'triple', 'home_run',
                 'walk', 'hbp', 'sac_fly', 'sac_bunt', 'out')),
  rbi          int  not null default 0 check (rbi between 0 and 4),
  stolen_bases int  not null default 0 check (stolen_bases between 0 and 3),
  unique (game_id, player_id, seq),
  foreign key (game_id, player_id)
    references public.game_participants (game_id, player_id) on delete cascade
);
create index plate_appearances_player_idx on public.plate_appearances (player_id);

-- 選手の初期値(2026年の移行用。打数・安打・塁打数は持たず計算で出す)
create table public.season_baselines (
  season       int  not null check (season between 2000 and 2100),
  player_id    uuid not null references public.players (id) on delete cascade,
  games        int  not null default 0 check (games >= 0),
  attendance   int  not null default 0 check (attendance >= 0),
  pa           int  not null default 0 check (pa >= 0),
  singles      int  not null default 0 check (singles >= 0),
  doubles      int  not null default 0 check (doubles >= 0),
  triples      int  not null default 0 check (triples >= 0),
  home_runs    int  not null default 0 check (home_runs >= 0),
  walks        int  not null default 0 check (walks >= 0),
  hbp          int  not null default 0 check (hbp >= 0),
  sac_flies    int  not null default 0 check (sac_flies >= 0),
  sac_bunts    int  not null default 0 check (sac_bunts >= 0),
  rbi          int  not null default 0 check (rbi >= 0),
  stolen_bases int  not null default 0 check (stolen_bases >= 0),
  primary key (season, player_id)
);

-- チームの初期値(移行用。as_of は初期値の時点)
create table public.team_season_baselines (
  season int  primary key check (season between 2000 and 2100),
  games  int  not null check (games >= 0),
  wins   int  not null check (wins >= 0),
  losses int  not null check (losses >= 0),
  draws  int  not null default 0 check (draws >= 0),
  as_of  date not null
);

-- 編集者(Supabase Auth のユーザーと紐づけ。追加・削除はダッシュボードから直接行う)
create table public.editors (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
);
