import { describe, expect, test } from "vitest";
import { fetchAll } from "./fetch-all";

describe("fetchAll", () => {
  test("1000行ごとに続きを取り、足りなくなったら止める", async () => {
    const source = Array.from({ length: 2500 }, (_, i) => i);
    const calls: [number, number][] = [];
    const rows = await fetchAll((from, to) => {
      calls.push([from, to]);
      return Promise.resolve({ data: source.slice(from, to + 1), error: null });
    });
    expect(rows).toEqual(source);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  test("ちょうど1000行のときは空ページまで取る", async () => {
    const source = Array.from({ length: 1000 }, (_, i) => i);
    const rows = await fetchAll((from, to) => Promise.resolve({ data: source.slice(from, to + 1), error: null }));
    expect(rows).toHaveLength(1000);
  });

  test("エラーは投げる", async () => {
    await expect(fetchAll(() => Promise.resolve({ data: null, error: { message: "boom" } }))).rejects.toThrow("boom");
  });
});
