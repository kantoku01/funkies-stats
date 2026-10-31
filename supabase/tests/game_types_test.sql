-- 試合の種類と大会の確認。失敗すると例外で止まる。
\set ON_ERROR_STOP on
set client_min_messages = notice;

create function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'NG: % (エラーになるはずが成功した)', label;
exception when others then
  if sqlerrm like 'NG:%' then raise; end if;
  raise notice 'OK: % -> %', label, sqlerrm;
end $$;
create function pg_temp.expect_ok(sql text, label text) returns void language plpgsql as $$
begin execute sql; raise notice 'OK: %', label; end $$;

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000e');
insert into public.editors (user_id, display_name) values ('00000000-0000-0000-0000-00000000000e', '編集者');
insert into public.tournaments (id, season, name) values ('30000000-0000-0000-0000-000000000001', 2026, '市民大会');

select pg_temp.expect_ok($$insert into public.games (game_date, result) values ('2026-09-20', 'win')$$, '種類を指定しなければオープン戦');
select pg_temp.expect_ok($$insert into public.games (game_date, result, game_type, tournament_id, stage, round_label) values ('2026-09-27', 'win', 'official', '30000000-0000-0000-0000-000000000001', 'knockout', '1回戦')$$, '公式戦(大会・段階・回戦)');
select pg_temp.expect_ok($$insert into public.games (game_date, result, game_type, tournament_id, stage) values ('2026-10-04', 'lose', 'official', '30000000-0000-0000-0000-000000000001', 'league')$$, '公式戦(回戦なし)');
select pg_temp.expect_error($$insert into public.games (game_date, result, game_type) values ('2026-10-04', 'win', 'official')$$, '公式戦に大会がない');
select pg_temp.expect_error($$insert into public.games (game_date, result, game_type, tournament_id) values ('2026-10-04', 'win', 'official', '30000000-0000-0000-0000-000000000001')$$, '公式戦に段階がない');
select pg_temp.expect_error($$insert into public.games (game_date, result, tournament_id) values ('2026-10-04', 'win', '30000000-0000-0000-0000-000000000001')$$, 'オープン戦に大会');
select pg_temp.expect_error($$insert into public.games (game_date, result, game_type, tournament_id, stage) values ('2026-10-04', 'win', 'official', '30000000-0000-0000-0000-000000000001', 'final')$$, '段階は2種類');
select pg_temp.expect_error($$insert into public.tournaments (season, name) values (2026, '市民大会')$$, '同じシーズンに同名の大会');
select pg_temp.expect_error($$delete from public.tournaments where id = '30000000-0000-0000-0000-000000000001'$$, '試合のある大会は削除できない');

-- 試合予定
select pg_temp.expect_ok($$insert into public.games (game_date, status, start_time, meet_time, venue, uniform, bring_bases) values ('2026-11-08', 'scheduled', '09:00', '08:30', '河川敷グラウンド', '白', true)$$, '予定の試合(結果なし)');
select pg_temp.expect_error($$insert into public.games (game_date, status, result) values ('2026-11-08', 'scheduled', 'win')$$, '予定の試合に勝敗');
select pg_temp.expect_error($$insert into public.games (game_date, status, team_score) values ('2026-11-08', 'scheduled', 3)$$, '予定の試合にスコア');
select pg_temp.expect_error($$insert into public.games (game_date) values ('2026-11-08')$$, '終了した試合に勝敗がない');
select pg_temp.expect_ok($$update public.games set status = 'completed', result = 'win', team_score = 5, opponent_score = 2 where venue = '河川敷グラウンド'$$, '予定 → 結果を入力して終了');
select pg_temp.expect_error($$update public.games set status = 'scheduled' where venue = '河川敷グラウンド'$$, '結果のある試合をそのまま予定に戻せない');
select pg_temp.expect_ok($$insert into public.games (game_date, status, venue) values ('2026-11-15', 'cancelled', '雨のグラウンド')$$, '雨天中止の試合');
select pg_temp.expect_error($$update public.games set result = 'win' where venue = '雨のグラウンド'$$, '雨天中止の試合に勝敗');
select pg_temp.expect_error($$insert into public.games (game_date, status) values ('2026-11-15', 'postponed')$$, '状態は3種類');
delete from public.games where venue = '雨のグラウンド';

set role anon;
select pg_temp.expect_ok($$select count(*) from public.tournaments$$, '匿名: 大会を閲覧できる');
select pg_temp.expect_error($$insert into public.tournaments (season, name) values (2026, '勝手な大会')$$, '匿名: 大会を追加できない');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select pg_temp.expect_ok($$insert into public.tournaments (season, name) values (2026, '秋季大会')$$, '編集者: 大会を追加できる');
reset role;

\echo 'GAME TYPE TESTS PASSED'
