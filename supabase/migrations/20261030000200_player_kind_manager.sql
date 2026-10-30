-- 選手の区分に「マネージャー」を追加する。
-- マネージャーは成績・参加者の対象外。加入日は正規メンバーと同じく必須、背番号は任意。

alter table public.players drop constraint players_kind_check;
alter table public.players add constraint players_kind_check check (kind in ('regular', 'guest', 'manager'));
