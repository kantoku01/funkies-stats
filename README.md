# ファンキーズ打撃成績

試合ごとに1打席ずつ結果を記録し、シーズン成績を自動集計する Web アプリ。
要件は [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) を参照。

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL / Auth / RLS)
- Vercel

## ディレクトリ

```
src/
  app/              画面(/ 成績一覧, /games 試合, /players 個人成績, /login, /admin 編集者向け)
  components/       共通コンポーネント
  lib/supabase/     Supabase クライアント(ブラウザ用 / サーバー用 / proxy 用)
  lib/auth.ts       ログイン中の編集者の取得
  lib/stats/        成績計算(打数・率・規定打席・シーズン集計)。計算はすべてここに集める
  lib/migration/    2026年移行データの読み込み
  proxy.ts          セッション更新と /admin の保護(旧 middleware)
  types/database.ts DB の型
data/
  baseline-2026.csv 2026年 9/13 時点のスプレッドシートの累計
supabase/
  migrations/       テーブル定義と RLS
  seed.sql          2026年の初期値(data/baseline-2026.csv から生成)
  tests/            マイグレーションと seed の検証 SQL
scripts/
  test-db.sh        素の PostgreSQL でマイグレーション・RLS・seed を検証
  generate-seed.ts  CSV から seed.sql を生成
```

## セットアップ

### 1. Supabase プロジェクトを作る

1. [Supabase](https://supabase.com/dashboard) で新しいプロジェクトを作る(リージョンは Tokyo 推奨)
2. **SQL Editor** で `supabase/migrations/` の SQL をファイル名の順に実行する
   (Supabase CLI を使う場合は `npx supabase link --project-ref <ref>` → `npx supabase db push`)
3. **Authentication > Sign In / Providers** で
   - 「Allow new users to sign up」を **オフ**(勝手な新規登録を防ぐ)
   - Email プロバイダーは **オンのまま**(オフにするとログインできなくなる)

### 2. 2026年の初期値を入れる

**SQL Editor** で `supabase/seed.sql` を実行する(選手21人・背番号・9/13 時点の累計・チーム成績)。

- 元データは `data/baseline-2026.csv`。CSV を直したら `npm run db:seed:generate` で seed.sql を作り直す
- 氏名は暫定で名字のみ。フルネームが分かったら SQL Editor で更新する(seed は固定 ID なので CSV の行順で指定できる):

  ```sql
  update public.players set full_name = '宮川 ○○' where id = '00000000-0000-4000-8000-000000000001';
  ```

### 3. 編集者を追加する

1. **Authentication > Users > Add user > Create new user** でメールアドレスとパスワードを登録
   (「Auto Confirm User」にチェック)
2. 作成したユーザーの UID をコピーし、**SQL Editor** で実行:

   ```sql
   insert into public.editors (user_id, display_name) values ('<UID>', 'Shinya');
   ```

編集者から外すときは `delete from public.editors where user_id = '<UID>';`。

### 4. ローカルで動かす

```bash
cp .env.example .env.local   # Project Settings > API Keys の URL と Publishable key を入れる
npm install
npm run dev                  # http://localhost:3000
```

### 5. LINE の自動送信(任意)

LINE 公式アカウントからチームのグループに、試合前日18時に連絡、試合翌日10時にスケジュールを自動で送る。
試合の画面の「チームのグループに送る」で手で送った前日連絡は、自動では送らない。

1. [LINE Official Account Manager](https://manager.line.biz/) で公式アカウントを作り、設定 > Messaging API で有効にする
2. [LINE Developers](https://developers.line.biz/console/) でそのチャネルを開き、
   - Messaging API 設定 > Webhook URL に `https://funkies-stats.vercel.app/api/line/webhook` を入れ、「Webhook の利用」をオン
   - 同じ画面の「グループトーク・複数人トークへの参加を許可する」をオン(Official Account Manager の応答設定にある場合も)
   - チャネルアクセストークン(長期)を発行
3. Vercel の Settings > Environment Variables に次を登録して、Redeploy する
   - `LINE_CHANNEL_ACCESS_TOKEN`(チャネルアクセストークン)/ `LINE_CHANNEL_SECRET`(チャネル基本設定のチャネルシークレット)
   - `SUPABASE_SECRET_KEY`(Supabase > Project Settings > API Keys の Secret key)
   - `CRON_SECRET`(長いランダムな文字列)
4. 公式アカウントをチームのグループに招待する(招待した時点で送り先として記録される)

無料プランは月200通まで(グループへの1回の送信は、グループの人数分として数えられる)。

## 開発コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm run lint` / `npm run typecheck` | ESLint / 型チェック |
| `npm test` | 単体テスト(Vitest)。移行データがシートの値と一致するかもここで確認 |
| `npm run test:db` | マイグレーション・RLS・seed の検証(PostgreSQL 15 以上が必要) |
| `npm run db:seed:generate` | `data/baseline-2026.csv` から `supabase/seed.sql` を生成 |

Docker があれば `npx supabase start` でローカルに Supabase 一式を立ち上げることもできる
(`supabase/config.toml` で新規登録は無効になっている)。
