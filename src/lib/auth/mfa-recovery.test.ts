import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  hashRecoveryCode,
  isMfaRecoveryPepperConfigured,
  normalizeRecoveryCode,
} from "@/lib/auth/mfa-recovery";

describe("MFA recovery pepper", () => {
  const originalPepper = process.env.MFA_RECOVERY_PEPPER;
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    delete process.env.MFA_RECOVERY_PEPPER;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    if (originalPepper === undefined) {
      delete process.env.MFA_RECOVERY_PEPPER;
    } else {
      process.env.MFA_RECOVERY_PEPPER = originalPepper;
    }
    if (originalServiceRole === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
    }
  });

  it("requires MFA_RECOVERY_PEPPER to be configured", () => {
    expect(isMfaRecoveryPepperConfigured()).toBe(false);
    expect(() => hashRecoveryCode("ABCD1234")).toThrow(/MFA_RECOVERY_PEPPER/);
  });

  it("does not fall back to the Supabase service role key", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    expect(isMfaRecoveryPepperConfigured()).toBe(false);
    expect(() => hashRecoveryCode("ABCD1234")).toThrow(/MFA_RECOVERY_PEPPER/);
  });

  it("hashes recovery codes with the dedicated pepper", () => {
    process.env.MFA_RECOVERY_PEPPER = "dedicated-pepper";
    const normalized = normalizeRecoveryCode("abcd-1234");
    expect(normalized).toBe("ABCD1234");
    expect(hashRecoveryCode(normalized)).toHaveLength(64);
    expect(hashRecoveryCode("ABCD-1234")).toBe(hashRecoveryCode("abcd1234"));
  });
});
