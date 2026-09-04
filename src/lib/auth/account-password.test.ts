import { describe, expect, it } from "vitest";

import { accountHasPasswordLogin } from "@/lib/auth/account-password";

describe("accountHasPasswordLogin", () => {
  it("detects email/password identities", () => {
    expect(
      accountHasPasswordLogin({
        identities: [{ provider: "google" }, { provider: "email" }],
      } as never),
    ).toBe(true);
  });

  it("returns false for OAuth-only accounts", () => {
    expect(
      accountHasPasswordLogin({
        identities: [{ provider: "google" }],
      } as never),
    ).toBe(false);
  });
});
