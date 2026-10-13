// data/baseline-2026.csv から supabase/seed.sql を作る。
//   node scripts/generate-seed.ts
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  BASELINE_SEASON,
  REGULAR_JOINED_ON,
  TEAM_BASELINE_2026,
  baselinePlayerId,
  parseBaselineCsv,
} from "../src/lib/migration/baseline-csv.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const rows = parseBaselineCsv(readFileSync(`${root}data/baseline-2026.csv`, "utf8"));

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const lines: string[] = [];
const out = (s = "") => lines.push(s);

out("-- 2026年シーズンの初期値(スプレッドシート 9/13 時点の累計)");
out("-- このファイルは scripts/generate-seed.ts が data/baseline-2026.csv から生成する。直接編集しないこと。");
out("-- 氏名は暫定で名字のみ。フルネームが分かったら players.full_name を更新する。");
out("begin;");
out();
out("insert into public.players (id, full_name, kind, joined_on) values");
out(
  rows
    .map((r) => `  (${q(baselinePlayerId(r.index))}, ${q(r.name)}, ${q(r.kind)}, ${r.kind === "regular" ? q(REGULAR_JOINED_ON) : "null"})`)
    .join(",\n") + ";",
);
out();
out("insert into public.season_numbers (season, player_id, number) values");
out(
  rows
    .filter((r) => r.number !== null)
    .map((r) => `  (${BASELINE_SEASON}, ${q(baselinePlayerId(r.index))}, ${q(r.number!)})`)
    .join(",\n") + ";",
);
out();
out(
  "insert into public.season_baselines (season, player_id, games, attendance, pa, singles, doubles, triples, home_runs, walks, hbp, sac_flies, sac_bunts, rbi, stolen_bases) values",
);
out(
  rows
    .map(
      (r) =>
        `  (${BASELINE_SEASON}, ${q(baselinePlayerId(r.index))}, ${[
          r.games, r.attendance, r.pa, r.singles, r.doubles, r.triples, r.home_runs,
          r.walks, r.hbp, r.sac_flies, r.sac_bunts, r.rbi, r.stolen_bases,
        ].join(", ")})`,
    )
    .join(",\n") + ";",
);
out();
const t = TEAM_BASELINE_2026;
out("insert into public.team_season_baselines (season, games, wins, losses, draws, as_of) values");
out(`  (${t.season}, ${t.games}, ${t.wins}, ${t.losses}, ${t.draws}, ${q(t.as_of)});`);
out();
out("commit;");

writeFileSync(`${root}supabase/seed.sql`, lines.join("\n") + "\n");
console.log(`supabase/seed.sql を生成しました(選手 ${rows.length} 人)`);
