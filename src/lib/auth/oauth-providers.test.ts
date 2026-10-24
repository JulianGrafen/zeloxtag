import { describe, expect, it } from "vitest";

import {
  isOAuthProvider,
  OAUTH_SIGNIN_PROVIDERS,
  oauthStartPath,
} from "@/lib/auth/oauth-providers";

describe("oauth providers", () => {
  it("accepts google and apple", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("apple")).toBe(true);
    expect(isOAuthProvider("facebook")).toBe(false);
  });

  it("excludes apple from sign-in buttons for now", () => {
    expect(OAUTH_SIGNIN_PROVIDERS).toEqual(["google"]);
    expect(OAUTH_SIGNIN_PROVIDERS).not.toContain("apple");
  });

  it("builds oauth start paths with next param", () => {
    expect(oauthStartPath("google", "/auth/continue")).toBe(
      "/auth/oauth/google?next=%2Fauth%2Fcontinue",
    );
  });
});
