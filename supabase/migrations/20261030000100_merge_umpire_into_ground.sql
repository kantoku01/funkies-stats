-- チーム経費: 「審判代」を「グラウンド代」にまとめ、項目名を「グラウンド・審判代」にする(表示名はアプリ側)。
-- 既に「審判代」で入力した記録も移す。

update public.ledger_entries set category = 'ground' where category = 'umpire';

alter table public.ledger_entries drop constraint ledger_category;
alter table public.ledger_entries add constraint ledger_category check (
  (kind = 'income' and category in ('dues', 'carryover', 'other_income')) or
  (kind = 'expense' and category in ('ground', 'equipment', 'tournament', 'social', 'other_expense'))
);
