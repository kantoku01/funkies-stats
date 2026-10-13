-- save_player_batting の確認。失敗すると例外で止まる。
\set ON_ERROR_STOP on
set client_min_messages = notice;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000e'),
  ('00000000-0000-0000-0000-00000000000a');
insert into public.editors (user_id, display_name) values ('00000000-0000-0000-0000-00000000000e', '編集者');
insert into public.players (id, full_name, kind, joined_on) values
  ('10000000-0000-0000-0000-000000000001', '宮川', 'regular', '2026-01-01'),
  ('10000000-0000-0000-0000-000000000002', '西岡', 'regular', '2026-01-01');
insert into public.games (id, game_date, result) values ('20000000-0000-0000-0000-000000000001', '2026-09-20', 'win');
insert into public.game_participants (game_id, player_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

create function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'NG: % (エラーになるはずが成功した)', label;
exception when others then
  if sqlerrm like 'NG:%' then raise; end if;
  raise notice 'OK: % -> %', label, sqlerrm;
end $$;

create function pg_temp.expect(actual text, expected text, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'NG: % (期待 %, 実際 %)', label, expected, actual; end if;
  raise notice 'OK: % = %', label, actual;
end $$;

create function pg_temp.pas() returns text language sql as $$
  select coalesce(string_agg(seq || ':' || result || '/' || rbi || '/' || stolen_bases, ' ' order by seq), '')
    from public.plate_appearances
   where player_id = '10000000-0000-0000-0000-000000000001'
$$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';

select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  '[{"result":"single","rbi":0,"stolen_bases":1},{"result":"home_run","rbi":2,"stolen_bases":0},{"result":"out"}]', 1);
select pg_temp.expect(pg_temp.pas(), '1:single/0/1 2:home_run/2/0 3:out/0/0', '保存(打席順に seq が振られる)');
select pg_temp.expect((select extra_stolen_bases::text from public.game_participants where player_id = '10000000-0000-0000-0000-000000000001'), '1', '打席外の盗塁');

select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  '[{"result":"walk","rbi":0,"stolen_bases":0}]', 0);
select pg_temp.expect(pg_temp.pas(), '1:walk/0/0', '入れ直し(前の打席は消える)');

select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '[]', 0);
select pg_temp.expect(pg_temp.pas(), '', '打席0で保存');

-- 失敗したら全体が取り消される(前の内容が残る)
select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
  '[{"result":"double","rbi":1,"stolen_bases":0}]', 0);
select pg_temp.expect_error($$select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '[{"result":"single"},{"result":"strikeout"}]', 0)$$, '不正な打席結果');
select pg_temp.expect(pg_temp.pas(), '1:double/1/0', '失敗時は元の打席が残る');
select pg_temp.expect_error($$select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '[{"result":"single","rbi":5}]', 0)$$, '打点5');
select pg_temp.expect_error($$select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '[]', 4)$$, '打席外の盗塁4');
select pg_temp.expect_error($$select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '[]', 0)$$, '参加者でない選手');
select pg_temp.expect_error($$select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '{"result":"single"}', 0)$$, '配列でない');

-- 編集者でないユーザー
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_error($$select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '[]', 0)$$, '編集者でないユーザー');
reset role;
select pg_temp.expect(pg_temp.pas(), '1:double/1/0', '編集者以外の呼び出しで消えていない');

set role anon;
select pg_temp.expect_error($$select public.save_player_batting('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '[]', 0)$$, '匿名ユーザーは実行できない');
reset role;

\echo 'BATTING TESTS PASSED'
