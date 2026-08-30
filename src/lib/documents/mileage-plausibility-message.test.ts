import { describe, expect, it } from "vitest";

import { isMileagePlausibilityMessage } from "./mileage-plausibility-message";

describe("isMileagePlausibilityMessage", () => {
  it("detects validateMileageAgainstHistory warnings", () => {
    expect(
      isMileagePlausibilityMessage(
        "Kilometerstand (187.100 km) liegt deutlich unter dem letzten Eintrag (294.683 km). Bitte prüfen.",
      ),
    ).toBe(true);
  });

  it("detects generic server fallback", () => {
    expect(isMileagePlausibilityMessage("Kilometerstand unplausibel.")).toBe(
      true,
    );
  });

  it("ignores unrelated errors", () => {
    expect(isMileagePlausibilityMessage("Analyse fehlgeschlagen.")).toBe(
      false,
    );
  });
});
