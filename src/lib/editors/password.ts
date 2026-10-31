import { randomInt } from "node:crypto";

// 仮のパスワード: 読み間違えやすい文字(0/O、1/l/I)を除いた英数字12文字
const CHARS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function temporaryPassword(length = 12): string {
  return Array.from({ length }, () => CHARS[randomInt(CHARS.length)]).join("");
}
