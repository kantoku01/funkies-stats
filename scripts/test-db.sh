#!/usr/bin/env bash
# 一時的な PostgreSQL を立ち上げ、Supabase スタブ + マイグレーションに対して
#   1. 制約と RLS のテスト (supabase/tests/rls_test.sql)
#   2. 打撃入力の保存     (supabase/tests/batting_test.sql)
#   3. seed の投入テスト   (supabase/seed.sql + supabase/tests/seed_test.sql)
# を別々のデータベースで流す。
# 必要なもの: PostgreSQL 15 以上のサーバー (initdb / pg_ctl) と psql
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
WORK="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  # root では initdb が動かないため postgres ユーザーで実行する
  chown postgres "$WORK"
  RUN_AS=(runuser -u postgres --)
fi

cleanup() { "${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

"${RUN_AS[@]}" "$PG_BIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
"${RUN_AS[@]}" "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null

psql_db() { psql -h "$WORK" -p "$PORT" -U postgres -d "$1" -v ON_ERROR_STOP=1 -q "${@:2}"; }
run_test() { psql_db "$1" -o /dev/null -f "$2" 2>&1 | sed "s/^psql:[^ ]* NOTICE:  /  /"; }

# スタブ用のロールはクラスタ全体で共通なので最初に1回だけ作る
psql_db postgres -c "create role anon nologin; create role authenticated nologin;"

setup_db() {
  psql_db postgres -c "create database $1"
  psql_db "$1" -f "$ROOT/supabase/tests/supabase_stub.sql"
  for f in "$ROOT"/supabase/migrations/*.sql; do
    psql_db "$1" -f "$f"
  done
}

echo "== 制約と RLS"
setup_db rls_test
run_test rls_test "$ROOT/supabase/tests/rls_test.sql"

echo "== 打撃入力の保存"
setup_db batting_test
run_test batting_test "$ROOT/supabase/tests/batting_test.sql"

echo "== seed"
setup_db seed_test
psql_db seed_test -f "$ROOT/supabase/seed.sql"
run_test seed_test "$ROOT/supabase/tests/seed_test.sql"
