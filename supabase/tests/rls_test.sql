-- マイグレーション後の制約と RLS の確認。失敗すると例外で止まる。
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- 準備(スーパーユーザーで投入)
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000e'),  -- 編集者
  ('00000000-0000-0000-0000-00000000000a');  -- ログインしただけの一般ユーザー
insert into public.editors (user_id, display_name) values ('00000000-0000-0000-0000-00000000000e', 'テスト編集者');

insert into public.players (id, full_name, kind, joined_on) values
  ('10000000-0000-0000-0000-000000000001', '宮川 太郎', 'regular', '2026-01-01'),
  ('10000000-0000-0000-0000-000000000002', '湯川 次郎', 'guest', null);
insert into public.season_numbers (season, player_id, number) values (2026, '10000000-0000-0000-0000-000000000001', '0');
insert into public.games (id, game_date, result) values ('20000000-0000-0000-0000-000000000001', '2026-09-20', 'win');
insert into public.game_participants (game_id, player_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');
insert into public.plate_appearances (game_id, player_id, seq, result, rbi, stolen_bases) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 'single', 0, 1),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2, 'home_run', 2, 0),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 1, 'out', 0, 0);

create function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'NG: % (エラーになるはずが成功した)', label;
exception when others then
  if sqlerrm like 'NG:%' then raise; end if;
  raise notice 'OK: % -> %', label, sqlerrm;
end $$;

create function pg_temp.expect_count(sql text, expected int, label text) returns void language plpgsql as $$
declare n int;
begin
  execute sql into n;
  if n is distinct from expected then raise exception 'NG: % (期待 %, 実際 %)', label, expected, n; end if;
  raise notice 'OK: % = %', label, n;
end $$;

-- 制約
select pg_temp.expect_count($$select season from public.games$$, 2026, 'season は試合日の年');
select pg_temp.expect_error($$insert into public.players (full_name, kind) values ('加入日なし', 'regular')$$, '正規メンバーは加入日必須');
select pg_temp.expect_count($$with i as (insert into public.players (full_name, kind, joined_on) values ('マネ', 'manager', '2026-04-01') returning 1) select count(*)::int from i$$, 1, 'マネージャーを登録できる');
select pg_temp.expect_error($$insert into public.players (full_name, kind) values ('マネ2', 'manager')$$, 'マネージャーも加入日必須');
select pg_temp.expect_error($$insert into public.players (full_name, kind, joined_on) values ('監督', 'coach', '2026-01-01')$$, '区分は3種類だけ');
select pg_temp.expect_error($$insert into public.season_numbers values (2026, '10000000-0000-0000-0000-000000000002', '0')$$, '同シーズンの背番号重複');
select pg_temp.expect_error($$insert into public.season_numbers values (2026, '10000000-0000-0000-0000-000000000002', 'A')$$, '背番号は数字のみ');
select pg_temp.expect_error($$insert into public.plate_appearances (game_id, player_id, seq, result, rbi) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 3, 'single', 5)$$, '打点は0〜4');
select pg_temp.expect_error($$insert into public.plate_appearances (game_id, player_id, seq, result) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 3, 'strikeout')$$, '打席結果は既定の9種類');
select pg_temp.expect_error($$insert into public.plate_appearances (game_id, player_id, seq, result) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 'out')$$, '同じ打席番号の重複');
select pg_temp.expect_error($$insert into public.game_participants (game_id, player_id, extra_stolen_bases) values ('20000000-0000-0000-0000-000000000001', gen_random_uuid(), 0)$$, '存在しない選手は参加できない');
select pg_temp.expect_error($$delete from public.players where id = '10000000-0000-0000-0000-000000000001'$$, '記録のある選手は削除できない');

-- 匿名ユーザー: 閲覧のみ
set role anon;
select pg_temp.expect_count($$select count(*)::int from public.plate_appearances$$, 3, '匿名: 打席を閲覧できる');
select pg_temp.expect_error($$select count(*) from public.editors$$, '匿名: editors は読めない');
select pg_temp.expect_error($$insert into public.games (game_date, result) values ('2026-10-01', 'win')$$, '匿名: 試合を追加できない');
reset role;

-- ログインしただけの一般ユーザー: 閲覧のみ
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_count($$select public.is_editor()::int$$, 0, '一般ユーザーは編集者ではない');
select pg_temp.expect_error($$insert into public.games (game_date, result) values ('2026-10-01', 'win')$$, '一般ユーザー: 試合を追加できない');
select pg_temp.expect_count($$with d as (delete from public.games returning 1) select count(*)::int from d$$, 0, '一般ユーザー: 削除しても0件');
select pg_temp.expect_count($$select count(*)::int from public.editors$$, 0, '一般ユーザー: editors は0件に見える');
reset role;

-- 編集者: 書き込み可
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select pg_temp.expect_count($$select public.is_editor()::int$$, 1, '編集者と判定される');
select pg_temp.expect_count($$select count(*)::int from public.editors$$, 1, '編集者: 自分の行だけ読める');
select pg_temp.expect_error($$insert into public.editors values ('00000000-0000-0000-0000-00000000000a', '勝手に追加')$$, '編集者でも editors は変更できない');
insert into public.games (game_date, result) values ('2026-10-04', 'lose');
select pg_temp.expect_count($$select count(*)::int from public.games$$, 2, '編集者: 試合を追加できる');

-- 参加者を外すと打席も消える
delete from public.game_participants
  where game_id = '20000000-0000-0000-0000-000000000001' and player_id = '10000000-0000-0000-0000-000000000002';
select pg_temp.expect_count($$select count(*)::int from public.plate_appearances$$, 2, '参加者削除で打席も消える');

-- 試合を消すと参加者と打席も消える
delete from public.games where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.expect_count($$select count(*)::int from public.game_participants$$, 0, '試合削除で参加者も消える');
select pg_temp.expect_count($$select count(*)::int from public.plate_appearances$$, 0, '試合削除で打席も消える');
reset role;

\echo 'ALL DB TESTS PASSED'
