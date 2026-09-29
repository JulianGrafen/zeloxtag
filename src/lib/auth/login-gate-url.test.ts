import { describe, expect, it } from "vitest";

import {
  loginGateHref,
  postPasswordLoginHref,
} from "@/lib/auth/login-gate-url";
import { isGenericPostLoginNext } from "@/lib/auth/post-login-path-guards";

describe("loginGateHref", () => {
  it("points at home with encoded next", () => {
    const href = loginGateHref("/garage/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(href).toBe(
      "/?next=%2Fgarage%2Faaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });
});

describe("postPasswordLoginHref", () => {
  it("routes deep links through auth/continue", () => {
    expect(
      postPasswordLoginHref(
        "/garage/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ),
    ).toBe(
      "/auth/continue?next=%2Fgarage%2Faaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });

  it("keeps generic targets on /auth/continue", () => {
    expect(postPasswordLoginHref("/auth/continue")).toBe("/auth/continue");
  });
});

describe("garage deep links", () => {
  it("are not generic post-login targets", () => {
    expect(
      isGenericPostLoginNext(
        "/garage/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ),
    ).toBe(false);
  });
});
