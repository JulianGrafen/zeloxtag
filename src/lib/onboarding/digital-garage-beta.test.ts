import { describe, expect, it } from "vitest";

import {
  isDigitalGarageBetaClosed,
  mapGarageRpcError,
} from "@/lib/onboarding/digital-garage-beta";

describe("isDigitalGarageBetaClosed", () => {
  it("is open when beta is not limited", () => {
    expect(isDigitalGarageBetaClosed({ limited: false })).toBe(false);
  });

  it("blocks new users when full and not enrolled", () => {
    expect(
      isDigitalGarageBetaClosed({
        limited: true,
        maxSlots: 15,
        usedSlots: 15,
        remaining: 0,
        full: true,
        enrolled: false,
      }),
    ).toBe(true);
  });

  it("allows enrolled users when full", () => {
    expect(
      isDigitalGarageBetaClosed({
        limited: true,
        maxSlots: 15,
        usedSlots: 15,
        remaining: 0,
        full: false,
        enrolled: true,
      }),
    ).toBe(false);
  });
});

describe("mapGarageRpcError", () => {
  it("maps beta_full to user message", () => {
    expect(mapGarageRpcError("beta_full")).toMatch(/Beta ist voll/);
  });
});
