import { expect, test } from "vitest";
import { toCsv } from "./csv";

test("toCsv: BOM・改行 CRLF・カンマや引用符を含む値のエスケープ", () => {
  expect(toCsv(["背番号", "氏名"], [["0", "宮川"], [null, 'A,"B"\n']])).toBe(
    '﻿背番号,氏名\r\n0,宮川\r\n,"A,""B""\n"\r\n',
  );
});
