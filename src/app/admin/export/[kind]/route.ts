import { NextResponse, type NextRequest } from "next/server";
import { getCurrentEditor } from "@/lib/auth";
import { buildCsv, EXPORT_KINDS, type ExportKind } from "@/lib/data/export";
import { todayInJapan } from "@/lib/season";

// CSV 書き出し(編集者のみ)
export async function GET(request: NextRequest, ctx: RouteContext<"/admin/export/[kind]">) {
  if (!(await getCurrentEditor())) {
    return new NextResponse("編集者としてログインしてください。", { status: 403 });
  }
  const { kind } = await ctx.params;
  if (!(kind in EXPORT_KINDS)) return new NextResponse("Not Found", { status: 404 });

  const season = Number(request.nextUrl.searchParams.get("season"));
  if (kind === "stats" && !(Number.isInteger(season) && season >= 2000 && season <= 2100)) {
    return new NextResponse("シーズンを指定してください。", { status: 400 });
  }

  const csv = await buildCsv(kind as ExportKind, season);
  const date = todayInJapan(new Date()).replaceAll("-", "");
  const filename = `funkies-${kind}${kind === "stats" ? `-${season}` : ""}-${date}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
