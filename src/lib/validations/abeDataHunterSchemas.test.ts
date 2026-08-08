import { describe, expect, it } from "vitest";

import {
  isAbeHuntAuflagenComplete,
  isAbeHuntMarkingComplete,
  isAbeHuntStammdatenComplete,
  isAbeHuntVehicleComplete,
  mergeAbeDataHunterSteps,
  missingAbeRequiredFields,
} from "@/lib/validations/abeDataHunterSchemas";

const completeStammdaten = {
  kbaNumber: "48185",
  abeNumber: "48185*08",
  abeHolder: "Alcar Leichtmetallräder GmbH",
  manufacturer: "Alcar Leichtmetallräder GmbH",
  partDesignation: "Sonderräder 8 J x 18 H2 Typ AVAG",
};

describe("abeDataHunterSchemas required fields", () => {
  it("requires all stammdaten fields", () => {
    expect(
      isAbeHuntStammdatenComplete({
        ...completeStammdaten,
        kbaNumber: null,
      }),
    ).toBe(false);
    expect(isAbeHuntStammdatenComplete(completeStammdaten)).toBe(true);
  });

  it("requires Kennzeichnung, Verkaufsbezeichnung and Auflagen", () => {
    expect(isAbeHuntMarkingComplete({ markingText: null })).toBe(false);
    expect(
      isAbeHuntMarkingComplete({
        markingText: "KBA-Nummer auf der Innenseite der Felge",
      }),
    ).toBe(true);

    expect(isAbeHuntVehicleComplete({ vehicleMatches: [] })).toBe(false);
    expect(
      isAbeHuntVehicleComplete({
        vehicleMatches: [
          {
            verkaufsbezeichnung: "5ER REIHE",
            fahrzeugtyp: null,
            typeApproval: null,
            driveType: null,
            tireSizes: [],
            auflagenCodes: [],
          },
        ],
      }),
    ).toBe(true);

    expect(
      isAbeHuntAuflagenComplete({ auflagenCodes: [], auflagenNotes: null }),
    ).toBe(false);
    expect(
      isAbeHuntAuflagenComplete({
        auflagenCodes: ["744", "A77"],
        auflagenNotes: null,
      }),
    ).toBe(true);
  });

  it("lists missing required fields for save gate", () => {
    const report = mergeAbeDataHunterSteps(
      completeStammdaten,
      { markingText: null },
      { vehicleMatches: [] },
      { auflagenCodes: [], auflagenNotes: null },
    );

    expect(missingAbeRequiredFields(report)).toEqual([
      "markingText",
      "verkaufsbezeichnung",
      "auflagenCodes",
    ]);
  });

  it("passes when all required facts are present", () => {
    const report = mergeAbeDataHunterSteps(
      completeStammdaten,
      { markingText: "Kennzeichnung auf dem Bauteil" },
      {
        vehicleMatches: [
          {
            verkaufsbezeichnung: "5ER REIHE",
            fahrzeugtyp: "5L",
            typeApproval: null,
            driveType: null,
            tireSizes: [],
            auflagenCodes: ["744"],
          },
        ],
      },
      { auflagenCodes: ["744", "A77"], auflagenNotes: null },
    );

    expect(missingAbeRequiredFields(report, "5ER REIHE")).toEqual([]);
  });
});
