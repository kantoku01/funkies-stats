import { createHmac } from "node:crypto";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { verifyLineSignature } = await import("./api");

describe("verifyLineSignature", () => {
  const body = '{"events":[]}';
  const sign = (secret: string) => createHmac("sha256", secret).update(body).digest("base64");
  test("正しい署名だけ通す", () => {
    expect(verifyLineSignature(body, sign("s3cret"), "s3cret")).toBe(true);
    expect(verifyLineSignature(body, sign("other"), "s3cret")).toBe(false);
    expect(verifyLineSignature(body, null, "s3cret")).toBe(false);
    expect(verifyLineSignature(body, sign("s3cret"), "")).toBe(false);
  });
});
