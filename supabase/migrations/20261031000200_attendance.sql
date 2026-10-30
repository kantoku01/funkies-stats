-- 月ごとの予定と出欠。
--   日付: 毎週日曜は自動で対象。schedule_dates は日曜の予定(練習 / 休み / 未定)やメモ、日曜以外に足した日付。
--         試合がある日は games から表示する(ここには持たない)。
--   出欠: 正規メンバーとマネージャーが ○(yes)/ △(maybe)/ ×(no)とコメントで答える。
--         ログインなしで答えられるよう、書き込みは answer_attendance 関数だけに絞り、中で対象の人と日付を確かめる。

create table public.schedule_dates (
  day   date primary key,
  kind  text not null default 'tbd' check (kind in ('practice', 'off', 'tbd')), -- 練習 / 休み / 未定
  note  text check (note is null or length(note) <= 100),
  extra boolean not null default false -- 日曜以外に足した日付
);

create table public.attendance_answers (
  day        date not null,
  player_id  uuid not null references public.players (id) on delete cascade,
  answer     text not null check (answer in ('yes', 'maybe', 'no')),
  comment    text check (comment is null or length(comment) <= 100),
  updated_at timestamptz not null default now(),
  primary key (day, player_id)
);
create index attendance_answers_player_idx on public.attendance_answers (player_id);

-- 出欠の回答(ログインなしでも呼べる)。p_answer が null なら回答を消す
create function public.answer_attendance(p_day date, p_player_id uuid, p_answer text, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 対象の日付: 日曜か、編集者が足した日付。遠すぎる過去・未来は受け付けない
  if p_day < current_date - 90 or p_day > current_date + 400 then
    raise exception '回答できない日付です' using errcode = '22023';
  end if;
  if extract(isodow from p_day) <> 7
     and not exists (select 1 from public.schedule_dates where day = p_day and extra) then
    raise exception '回答できない日付です' using errcode = '22023';
  end if;

  -- 対象の人: その日に在籍している正規メンバーかマネージャー
  if not exists (
    select 1 from public.players
     where id = p_player_id
       and kind in ('regular', 'manager')
       and joined_on <= p_day
       and (left_on is null or left_on >= p_day)
  ) then
    raise exception '回答できないメンバーです' using errcode = '22023';
  end if;

  if p_answer is null then
    delete from public.attendance_answers where day = p_day and player_id = p_player_id;
    return;
  end if;
  if p_answer not in ('yes', 'maybe', 'no') then
    raise exception '回答が正しくありません' using errcode = '22023';
  end if;

  insert into public.attendance_answers (day, player_id, answer, comment, updated_at)
  values (p_day, p_player_id, p_answer, nullif(trim(left(coalesce(p_comment, ''), 100)), ''), now())
  on conflict (day, player_id)
  do update set answer = excluded.answer, comment = excluded.comment, updated_at = now();
end
$$;

revoke execute on function public.answer_attendance(date, uuid, text, text) from public;
grant execute on function public.answer_attendance(date, uuid, text, text) to anon, authenticated;

-- 閲覧は誰でも。直接の書き込みは編集者だけ(回答は上の関数から)
alter table public.schedule_dates enable row level security;
alter table public.attendance_answers enable row level security;
create policy "schedule_dates: 誰でも閲覧可" on public.schedule_dates for select to anon, authenticated using (true);
create policy "schedule_dates: 編集者のみ追加" on public.schedule_dates for insert to authenticated with check ((select public.is_editor()));
create policy "schedule_dates: 編集者のみ更新" on public.schedule_dates for update to authenticated using ((select public.is_editor())) with check ((select public.is_editor()));
create policy "schedule_dates: 編集者のみ削除" on public.schedule_dates for delete to authenticated using ((select public.is_editor()));
create policy "attendance_answers: 誰でも閲覧可" on public.attendance_answers for select to anon, authenticated using (true);
create policy "attendance_answers: 編集者のみ削除" on public.attendance_answers for delete to authenticated using ((select public.is_editor()));

grant select on public.schedule_dates, public.attendance_answers to anon, authenticated;
grant insert, update, delete on public.schedule_dates to authenticated;
grant delete on public.attendance_answers to authenticated;
