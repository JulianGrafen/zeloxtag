import { describe, expect, it } from "vitest";

import {
  exposePublicPath,
  exposeTokenSchema,
  generateExposeToken,
  isValidExposeToken,
} from "./expose-token";

describe("exposeTokenSchema", () => {
  it("accepts a UUID and rejects vehicle-id-style or empty tokens", () => {
    const token = generateExposeToken();
    expect(exposeTokenSchema.safeParse(token).success).toBe(true);
    expect(isValidExposeToken(token)).toBe(true);
    expect(exposePublicPath(token)).toBe(`/expose/${token}`);

    expect(exposeTokenSchema.safeParse("not-a-token").success).toBe(false);
    expect(exposeTokenSchema.safeParse("").success).toBe(false);
    expect(exposeTokenSchema.safeParse("v/demo-active-tag").success).toBe(false);
  });
});
