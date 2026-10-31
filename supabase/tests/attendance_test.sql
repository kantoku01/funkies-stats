-- 出欠の確認。失敗すると例外で止まる。
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
create function pg_temp.expect(actual text, expected text, label text) returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'NG: % (期待 %, 実際 %)', label, expected, actual; end if;
  raise notice 'OK: % = %', label, actual;
end $$;

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000e');
insert into public.editors (user_id, display_name) values ('00000000-0000-0000-0000-00000000000e', '編集者');
insert into public.players (id, full_name, kind, joined_on, left_on) values
  ('10000000-0000-0000-0000-000000000001', '宮川', 'regular', '2020-01-01', null),
  ('10000000-0000-0000-0000-000000000002', 'マネ', 'manager', '2020-01-01', null),
  ('10000000-0000-0000-0000-000000000003', '助っ人', 'guest', null, null),
  ('10000000-0000-0000-0000-000000000004', '退団者', 'regular', '2020-01-01', '2020-12-31');

-- 次の日曜と、その翌日(月曜)
create temp table d as
  select (current_date + ((7 - extract(isodow from current_date)::int) % 7)) as sun;
grant select on d to anon, authenticated;
create function pg_temp.sun() returns date language sql as $$ select sun from d $$;

set role anon;
select public.answer_attendance(pg_temp.sun(), '10000000-0000-0000-0000-000000000001', 'yes', ' 行けます ');
select pg_temp.expect((select answer || '/' || comment from public.attendance_answers where player_id = '10000000-0000-0000-0000-000000000001'), 'yes/行けます', '匿名: 日曜に回答できる');
select public.answer_attendance(pg_temp.sun(), '10000000-0000-0000-0000-000000000001', 'maybe', '');
select pg_temp.expect((select answer || '/' || coalesce(comment, '-') from public.attendance_answers where player_id = '10000000-0000-0000-0000-000000000001'), 'maybe/-', '回答を変えられる(空のコメントは消える)');
select public.answer_attendance(pg_temp.sun(), '10000000-0000-0000-0000-000000000002', 'no', null);
select pg_temp.expect((select count(*)::text from public.attendance_answers), '2', 'マネージャーも回答できる');
select pg_temp.expect_error($$select public.answer_attendance(pg_temp.sun() + 1, '10000000-0000-0000-0000-000000000001', 'yes', null)$$, '日曜以外は回答できない');
select pg_temp.expect_error($$select public.answer_attendance(pg_temp.sun(), '10000000-0000-0000-0000-000000000003', 'yes', null)$$, '助っ人は回答できない');
select pg_temp.expect_error($$select public.answer_attendance(pg_temp.sun(), '10000000-0000-0000-0000-000000000004', 'yes', null)$$, '退団者は回答できない');
select pg_temp.expect_error($$select public.answer_attendance(pg_temp.sun(), '10000000-0000-0000-0000-000000000001', 'ok', null)$$, '回答は3種類');
select pg_temp.expect_error($$select public.answer_attendance(pg_temp.sun() + 7 * 70, '10000000-0000-0000-0000-000000000001', 'yes', null)$$, '遠い未来は回答できない');
select pg_temp.expect_error($$insert into public.attendance_answers (day, player_id, answer) values (current_date, '10000000-0000-0000-0000-000000000001', 'yes')$$, '匿名: 直接は書き込めない');
select pg_temp.expect_error($$insert into public.schedule_dates (day) values (current_date)$$, '匿名: 予定は書き込めない');
select public.answer_attendance(pg_temp.sun(), '10000000-0000-0000-0000-000000000002', null, null);
select pg_temp.expect((select count(*)::text from public.attendance_answers), '1', '回答を取り消せる');
reset role;

-- 編集者が日曜以外の日付を足すと、その日も回答できる
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
insert into public.schedule_dates (day, kind, note, extra) select pg_temp.sun() + 1, 'practice', '祝日練習', true;
reset role;
set role anon;
select public.answer_attendance(pg_temp.sun() + 1, '10000000-0000-0000-0000-000000000001', 'yes', null);
select pg_temp.expect((select count(*)::text from public.attendance_answers), '2', '足した日付には回答できる');
reset role;

-- 選手を消すと回答も消える
delete from public.players where id = '10000000-0000-0000-0000-000000000004';
-- 別の予定(忘年会など)の出欠
create temp table ev (id uuid);
grant select, insert on ev to anon, authenticated;
set role anon;
select pg_temp.expect_error($$insert into public.schedule_events (day, title) values (current_date, '忘年会')$$, '匿名: 別の予定は作れない');
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
with x as (insert into public.schedule_events (day, title, start_time, place) select pg_temp.sun(), '忘年会', '19:00', 'といとい' returning id)
insert into ev select id from x;
reset role;
set role anon;
select public.answer_event((select id from ev), '10000000-0000-0000-0000-000000000001', 'no', '練習だけ');
select public.answer_event((select id from ev), '10000000-0000-0000-0000-000000000002', 'yes', null);
select pg_temp.expect((select string_agg(answer, ',' order by player_id) from public.event_answers), 'no,yes', '別の予定にも回答できる');
select pg_temp.expect((select answer from public.attendance_answers where day = pg_temp.sun() and player_id = '10000000-0000-0000-0000-000000000001'), 'maybe', 'その日の出欠とは別に集計される');
select pg_temp.expect_error($$select public.answer_event((select id from ev), '10000000-0000-0000-0000-000000000003', 'yes', null)$$, '別の予定: 助っ人は回答できない');
select pg_temp.expect_error($$select public.answer_event(gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'yes', null)$$, '別の予定: ない予定には回答できない');
select public.answer_event((select id from ev), '10000000-0000-0000-0000-000000000002', null, null);
select pg_temp.expect((select count(*)::text from public.event_answers), '1', '別の予定: 回答を取り消せる');
reset role;
delete from public.schedule_events;
select pg_temp.expect((select count(*)::text from public.event_answers), '0', '別の予定を消すと回答も消える');

\echo 'ATTENDANCE TESTS PASSED'
