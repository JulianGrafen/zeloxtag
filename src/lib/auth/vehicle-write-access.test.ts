import { describe, expect, it } from "vitest";

import { writeAccessErrorMessage } from "@/lib/auth/vehicle-write-access";

describe("writeAccessErrorMessage", () => {
  it("falls back when no message is set", () => {
    expect(
      writeAccessErrorMessage({
        ok: false,
        isOwner: false,
        isContributor: false,
        ownerUserId: null,
        vehicleId: null,
      }),
    ).toMatch(/Schreibzugriff/);
  });
});
