import { describe, expect, test } from "vitest";
import { addRatio, compareRatio, formatRate, mulRatio, ratio, roundToThousandths } from "./ratio";

describe("formatRate", () => {
  test("1未満は先頭の0を省く", () => {
    expect(formatRate(ratio(1, 3))).toBe(".333");
    expect(formatRate(ratio(2, 3))).toBe(".667");
  });
  test("1以上はそのまま", () => {
    expect(formatRate(ratio(1034, 1000))).toBe("1.034");
    expect(formatRate(ratio(1, 1))).toBe("1.000");
    expect(formatRate(ratio(3, 2))).toBe("1.500");
  });
  test("分母0は .000", () => {
    expect(formatRate(ratio(0, 0))).toBe(".000");
    expect(formatRate(ratio(5, 0))).toBe(".000");
  });
  test("0.0005 ちょうどは切り上げ(浮動小数の誤差で切り捨てない)", () => {
    expect(formatRate(ratio(2725, 10000))).toBe(".273");
    expect(formatRate(ratio(1, 2000))).toBe(".001");
    expect(formatRate(ratio(9995, 10000))).toBe("1.000");
  });
});

describe("分数の計算", () => {
  test("足し算・掛け算は分母0を0として扱う", () => {
    expect(roundToThousandths(addRatio(ratio(1, 2), ratio(1, 4)))).toBe(750);
    expect(roundToThousandths(addRatio(ratio(1, 2), ratio(0, 0)))).toBe(500);
    expect(roundToThousandths(mulRatio(ratio(2, 3), ratio(3, 4)))).toBe(500);
    expect(roundToThousandths(mulRatio(ratio(0, 0), ratio(3, 4)))).toBe(0);
  });
  test("比較", () => {
    expect(compareRatio(ratio(1, 3), ratio(1, 2))).toBeLessThan(0);
    expect(compareRatio(ratio(2, 4), ratio(1, 2))).toBe(0);
    expect(compareRatio(ratio(0, 0), ratio(0, 5))).toBe(0);
  });
});
