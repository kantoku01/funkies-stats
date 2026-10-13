# ファンキーズ打撃成績

試合ごとに1打席ずつ結果を記録し、シーズン成績を自動集計する Web アプリ。
要件は [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) を参照。

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL / Auth / RLS)
- Vercel

## ディレクトリ

```
src/
  app/              画面(/ 成績一覧, /login, /admin 編集者向け)
  components/       共通コンポーネント
  lib/supabase/     Supabase クライアント(ブラウザ用 / サーバー用 / proxy 用)
  lib/auth.ts       ログイン中の編集者の取得
  proxy.ts          セッション更新と /admin の保護(旧 middleware)
  types/database.ts DB の型
supabase/
  migrations/       テーブル定義と RLS
  tests/            マイグレーションの検証 SQL
scripts/test-db.sh  素の PostgreSQL でマイグレーションと RLS を検証
```

## セットアップ

### 1. Supabase プロジェクトを作る

1. [Supabase](https://supabase.com/dashboard) で新しいプロジェクトを作る(リージョンは Tokyo 推奨)
2. **SQL Editor** で `supabase/migrations/` の SQL をファイル名の順に実行する
   (Supabase CLI を使う場合は `npx supabase link --project-ref <ref>` → `npx supabase db push`)
3. **Authentication > Sign In / Providers** で
   - 「Allow new users to sign up」を **オフ**(勝手な新規登録を防ぐ)
   - Email プロバイダーは **オンのまま**(オフにするとログインできなくなる)

### 2. 編集者を追加する

1. **Authentication > Users > Add user > Create new user** でメールアドレスとパスワードを登録
   (「Auto Confirm User」にチェック)
2. 作成したユーザーの UID をコピーし、**SQL Editor** で実行:

   ```sql
   insert into public.editors (user_id, display_name) values ('<UID>', 'Shinya');
   ```

編集者から外すときは `delete from public.editors where user_id = '<UID>';`。

### 3. ローカルで動かす

```bash
cp .env.example .env.local   # Project Settings > API Keys の URL と Publishable key を入れる
npm install
npm run dev                  # http://localhost:3000
```

## 開発コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run lint` / `npm run typecheck` | ESLint / 型チェック |
| `npm test` | 単体テスト(Vitest) |
| `npm run test:db` | マイグレーションと RLS の検証(PostgreSQL 15 以上が必要) |

Docker があれば `npx supabase start` でローカルに Supabase 一式を立ち上げることもできる
(`supabase/config.toml` で新規登録は無効になっている)。
