-- seed.sql 投入後の確認。失敗すると例外で止まる。
\set ON_ERROR_STOP on
set client_min_messages = notice;

do $$
declare
  n_players int; n_numbers int; pa int; ab int; h int;
begin
  select count(*) into n_players from public.players;
  select count(*) into n_numbers from public.season_numbers where season = 2026;
  select sum(b.pa), sum(b.pa - b.walks - b.hbp - b.sac_flies - b.sac_bunts),
         sum(b.singles + b.doubles + b.triples + b.home_runs)
    into pa, ab, h from public.season_baselines b where season = 2026;

  if n_players <> 21 then raise exception 'NG: 選手数 %', n_players; end if;
  if n_numbers <> 18 then raise exception 'NG: 背番号 %', n_numbers; end if;
  if (pa, ab, h) <> (868, 732, 199) then raise exception 'NG: 打席/打数/安打 % / % / %', pa, ab, h; end if;
  if not exists (select 1 from public.team_season_baselines where season = 2026 and games = 30 and wins = 16 and losses = 14) then
    raise exception 'NG: チーム初期値';
  end if;
  if (select number from public.season_numbers n join public.players p on p.id = n.player_id where p.full_name = '宮川') <> '0' then
    raise exception 'NG: 宮川の背番号';
  end if;
  raise notice 'OK: seed 選手 % 人、背番号 % 件、打席 % / 打数 % / 安打 %', n_players, n_numbers, pa, ab, h;
end $$;

\echo 'SEED TEST PASSED'
