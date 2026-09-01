import { describe, expect, it } from "vitest";

import {
  isInternalErrorMessage,
  isPublicClientMessage,
  publicAuthMessage,
  publicClientMessage,
} from "./public-error";

describe("publicClientMessage", () => {
  it("returns safe app messages", () => {
    expect(
      publicClientMessage(
        new Error("Bitte ein JPG oder PNG hochladen."),
        "Fallback",
      ),
    ).toBe("Bitte ein JPG oder PNG hochladen.");
  });

  it("blocks provider and database internals", () => {
    expect(
      publicClientMessage(
        new Error("PGRST202: function claim_unclaimed_tag not found"),
        "Fallback",
      ),
    ).toBe("Fallback");
    expect(
      publicClientMessage(
        new Error("401 Unauthorized: invalid API key sk-test"),
        "Fallback",
      ),
    ).toBe("Fallback");
  });
});

describe("isInternalErrorMessage", () => {
  it("flags long and empty strings", () => {
    expect(isInternalErrorMessage("")).toBe(true);
    expect(isInternalErrorMessage("x".repeat(241))).toBe(true);
  });
});

describe("isPublicClientMessage", () => {
  it("accepts short German UX copy", () => {
    expect(isPublicClientMessage("Nur der Fahrzeughalter darf hochladen.")).toBe(
      true,
    );
  });
});

describe("publicAuthMessage", () => {
  it("passes through known Supabase auth errors", () => {
    expect(
      publicAuthMessage(new Error("Invalid login credentials")),
    ).toBe("Invalid login credentials");
  });

  it("hides internal auth failures", () => {
    expect(
      publicAuthMessage(new Error("Database error querying schema")),
    ).toBe("Anmeldung fehlgeschlagen.");
  });
});
