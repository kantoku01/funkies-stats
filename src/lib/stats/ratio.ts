// 率は分数のまま持ち、表示や並べ替えの直前にだけ数値にする。
// 浮動小数の誤差で四捨五入がずれる(.2725 が .272 になる等)のを避けるため。

export type Ratio = { num: number; den: number };

export const ratio = (num: number, den: number): Ratio => ({ num, den });

// 分母0は0として扱う(要件: 分母が0の場合は .000)
export function ratioValue(r: Ratio): number {
  return r.den === 0 ? 0 : r.num / r.den;
}

function normalize(r: Ratio): Ratio {
  return r.den === 0 ? { num: 0, den: 1 } : r;
}

export function addRatio(a: Ratio, b: Ratio): Ratio {
  const x = normalize(a);
  const y = normalize(b);
  return { num: x.num * y.den + y.num * x.den, den: x.den * y.den };
}

export function mulRatio(a: Ratio, b: Ratio): Ratio {
  const x = normalize(a);
  const y = normalize(b);
  return { num: x.num * y.num, den: x.den * y.den };
}

export function compareRatio(a: Ratio, b: Ratio): number {
  const x = normalize(a);
  const y = normalize(b);
  return x.num * y.den - y.num * x.den;
}

// 小数第3位まで四捨五入した値を千分率の整数で返す(整数演算なので誤差なし)
export function roundToThousandths(r: Ratio): number {
  if (r.den === 0) return 0;
  return Math.floor((r.num * 2000 + r.den) / (2 * r.den));
}

// .333 / 1.034 / .000 の形式にする
export function formatRate(r: Ratio): string {
  const t = roundToThousandths(r);
  const whole = Math.floor(t / 1000);
  const frac = String(t % 1000).padStart(3, "0");
  return whole === 0 ? `.${frac}` : `${whole}.${frac}`;
}
