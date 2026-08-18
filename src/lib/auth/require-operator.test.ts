import { afterEach, describe, expect, it } from "vitest";

import { isOperatorEmail, readSuperuserEmail } from "@/lib/auth/require-operator";

const ORIGINAL_SUPERUSER = process.env.ZELOXTAG_SUPERUSER_EMAIL;
const ORIGINAL_OPERATORS = process.env.ZELOXTAG_OPERATOR_EMAILS;

afterEach(() => {
  if (ORIGINAL_SUPERUSER === undefined) {
    delete process.env.ZELOXTAG_SUPERUSER_EMAIL;
  } else {
    process.env.ZELOXTAG_SUPERUSER_EMAIL = ORIGINAL_SUPERUSER;
  }
  if (ORIGINAL_OPERATORS === undefined) {
    delete process.env.ZELOXTAG_OPERATOR_EMAILS;
  } else {
    process.env.ZELOXTAG_OPERATOR_EMAILS = ORIGINAL_OPERATORS;
  }
});

describe("readSuperuserEmail", () => {
  it("uses the dedicated single superuser email", () => {
    process.env.ZELOXTAG_SUPERUSER_EMAIL = " julian@zeloxtag.de ";
    process.env.ZELOXTAG_OPERATOR_EMAILS = "other@zeloxtag.de,third@zeloxtag.de";
    expect(readSuperuserEmail()).toBe("julian@zeloxtag.de");
    expect(isOperatorEmail("julian@zeloxtag.de")).toBe(true);
    expect(isOperatorEmail("other@zeloxtag.de")).toBe(false);
  });

  it("falls back to operator env only when it is a single address", () => {
    delete process.env.ZELOXTAG_SUPERUSER_EMAIL;
    process.env.ZELOXTAG_OPERATOR_EMAILS = "solo@zeloxtag.de";
    expect(readSuperuserEmail()).toBe("solo@zeloxtag.de");
  });

  it("locks minting when a comma-separated operator list is set without superuser", () => {
    delete process.env.ZELOXTAG_SUPERUSER_EMAIL;
    process.env.ZELOXTAG_OPERATOR_EMAILS = "a@zeloxtag.de,b@zeloxtag.de";
    expect(readSuperuserEmail()).toBeNull();
    expect(isOperatorEmail("a@zeloxtag.de")).toBe(false);
  });
});
