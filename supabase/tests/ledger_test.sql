-- ledger_entries の制約と RLS の確認。失敗すると例外で止まる。
\set ON_ERROR_STOP on
set client_min_messages = notice;

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000e');
insert into public.editors (user_id, display_name) values ('00000000-0000-0000-0000-00000000000e', '編集者');
insert into public.players (id, full_name, kind, joined_on) values
  ('10000000-0000-0000-0000-000000000001', '宮川', 'regular', '2026-01-01');
insert into public.games (id, game_date, result) values ('20000000-0000-0000-0000-000000000001', '2026-09-20', 'win');

create function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'NG: % (エラーになるはずが成功した)', label;
exception when others then
  if sqlerrm like 'NG:%' then raise; end if;
  raise notice 'OK: % -> %', label, sqlerrm;
end $$;

create function pg_temp.expect_ok(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise notice 'OK: %', label;
end $$;

select pg_temp.expect_ok($$insert into public.ledger_entries (entry_date, kind, category, amount, player_id) values ('2026-04-01', 'income', 'dues', 10000, '10000000-0000-0000-0000-000000000001')$$, '年会費(納入者あり)');
select pg_temp.expect_ok($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-01-01', 'income', 'carryover', 52000)$$, '繰越金');
select pg_temp.expect_ok($$insert into public.ledger_entries (entry_date, kind, category, amount, player_id, game_id) values ('2026-09-20', 'expense', 'ground', 3000, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001')$$, '立て替え(試合に紐づけ)');
select pg_temp.expect_ok($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-09-20', 'expense', 'social', 2000)$$, '部費から直接');
select pg_temp.expect_ok($$update public.ledger_entries set settled_on = '2026-09-27' where category = 'ground'$$, '立て替えの精算');

select pg_temp.expect_error($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-04-01', 'income', 'dues', 10000)$$, '年会費に納入者がない');
select pg_temp.expect_error($$insert into public.ledger_entries (entry_date, kind, category, amount, player_id) values ('2026-04-01', 'income', 'carryover', 100, '10000000-0000-0000-0000-000000000001')$$, '繰越金に選手');
select pg_temp.expect_error($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-04-01', 'income', 'ground', 100)$$, '収入にグラウンド代');
select pg_temp.expect_error($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-04-01', 'expense', 'food', 100)$$, '存在しない項目');
select pg_temp.expect_error($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-04-01', 'expense', 'umpire', 100)$$, '審判代はグラウンド・審判代にまとめた');
select pg_temp.expect_error($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-04-01', 'expense', 'ground', 0)$$, '金額0');
select pg_temp.expect_error($$insert into public.ledger_entries (entry_date, kind, category, amount, settled_on) values ('2026-04-01', 'expense', 'ground', 100, '2026-04-02')$$, '部費から直接なのに精算日');
select pg_temp.expect_error($$delete from public.players where id = '10000000-0000-0000-0000-000000000001'$$, '入出金のある選手は削除できない');

-- 相手チームへの支払い(経費の種類)
select pg_temp.expect_ok($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-09-20', 'expense', 'opponent', 3000)$$, '相手チームへの支払い');

-- 試合の当日のお金
select pg_temp.expect_ok($$insert into public.game_costs (game_id, item, amount, opponent_share) values ('20000000-0000-0000-0000-000000000001', 'umpire', 7000, 5000)$$, '審判代(うち相手チームから)');
select pg_temp.expect_ok($$insert into public.game_costs (game_id, item, amount, payer, player_id) values ('20000000-0000-0000-0000-000000000001', 'ground', 12000, 'player', '10000000-0000-0000-0000-000000000001')$$, 'グラウンド代(立て替え)');
select pg_temp.expect_error($$insert into public.game_costs (game_id, item, amount, opponent_share) values ('20000000-0000-0000-0000-000000000001', 'umpire', 7000, 8000)$$, '相手チームからの額が総額より多い');
select pg_temp.expect_error($$insert into public.game_costs (game_id, item, amount, opponent_share) values ('20000000-0000-0000-0000-000000000001', 'opponent', 3000, 1000)$$, '相手チームへの支払いに相手チームから');
select pg_temp.expect_error($$insert into public.game_costs (game_id, item, amount, payer) values ('20000000-0000-0000-0000-000000000001', 'ground', 1000, 'player')$$, '立て替えなのに人がいない');
select pg_temp.expect_ok($$insert into public.game_costs (game_id, item, amount) values ('20000000-0000-0000-0000-000000000001', 'ground_umpire', 11000)$$, 'グラウンド代＋審判代');
select pg_temp.expect_error($$insert into public.game_costs (game_id, item, amount) values ('20000000-0000-0000-0000-000000000001', 'food', 1000)$$, '当日のお金にない項目');
set role anon;
select pg_temp.expect_ok($$select * from public.game_costs$$, '匿名: 当日のお金は見られる');
select pg_temp.expect_error($$insert into public.game_costs (game_id, item, amount) values ('20000000-0000-0000-0000-000000000001', 'ground', 1000)$$, '匿名: 当日のお金は書き込めない');
reset role;

-- 試合を消しても入出金は残り、紐づけだけ外れる
delete from public.games where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.ledger_entries where category = 'ground' and game_id is null) <> 1 then
    raise exception 'NG: 試合削除で入出金が消えた';
  end if;
  raise notice 'OK: 試合を消しても入出金は残る';
end $$;

-- 匿名: 閲覧のみ
set role anon;
select pg_temp.expect_ok($$select count(*) from public.ledger_entries$$, '匿名: 閲覧できる');
select pg_temp.expect_error($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-04-01', 'expense', 'ground', 100)$$, '匿名: 追加できない');
reset role;

-- 編集者でないログインユーザー
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_error($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-04-01', 'expense', 'ground', 100)$$, '一般ユーザー: 追加できない');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
select pg_temp.expect_ok($$insert into public.ledger_entries (entry_date, kind, category, amount) values ('2026-04-02', 'expense', 'social', 5000)$$, '編集者: 追加できる');
reset role;

\echo 'LEDGER TESTS PASSED'
