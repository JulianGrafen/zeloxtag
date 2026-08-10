import { describe, expect, it } from "vitest";

import {
  ABE_HUNT_FIELD_SCAN_HINTS,
  ABE_HUNT_FIELD_WATERMARKS,
  ABE_REQUIRED_FIELD_LABELS,
  abeHuntFieldDisplayLabel,
  emptyAbeDataHunterReport,
  fillAbeDataHunterReport,
  isAbeHuntAuflagenComplete,
  isAbeHuntMarkingComplete,
  isAbeHuntStammdatenComplete,
  isAbeHuntVehicleComplete,
  mergeAbeDataHunterSteps,
  missingAbeCoreHuntFields,
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
      "auflagenNotes",
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
            auflagenCodes: ["744", "A77"],
          },
        ],
      },
      { auflagenCodes: [], auflagenNotes: "744: Montage nur mit …\nA77: Weitere Bedingung" },
    );

    expect(missingAbeRequiredFields(report, "5ER REIHE")).toEqual([]);
  });

  it("keeps auflagenNotes missing until every table Kürzel has text", () => {
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
            auflagenCodes: ["744", "F40", "L04"],
          },
        ],
      },
      { auflagenCodes: [], auflagenNotes: "744: Nur teilweise erfasst." },
    );

    expect(missingAbeRequiredFields(report, "5ER REIHE")).toEqual([
      "auflagenNotes",
    ]);
  });

  it("infers KBA from Nummer der ABE when kbaNumber was not extracted separately", () => {
    const merged = fillAbeDataHunterReport(emptyAbeDataHunterReport(), {
      ...emptyAbeDataHunterReport(),
      abeNumber: "48185*08",
    });
    expect(merged.kbaNumber).toBe("48185");
    expect(missingAbeCoreHuntFields(merged)).not.toContain("kbaNumber");
  });

  it("normalizes KBA when OCR returns ABE-style suffix in kbaNumber field", () => {
    const merged = fillAbeDataHunterReport(emptyAbeDataHunterReport(), {
      ...emptyAbeDataHunterReport(),
      kbaNumber: "48185*08",
    });
    expect(merged.kbaNumber).toBe("48185");
  });

  it("treats vehicle table rows as captured Fahrzeugmodell for hunt progress", () => {
    const report = mergeAbeDataHunterSteps(
      completeStammdaten,
      { markingText: "Kennzeichnung auf dem Bauteil" },
      {
        vehicleMatches: [
          {
            verkaufsbezeichnung: "",
            fahrzeugtyp: "5L",
            typeApproval: "e1*2007/46",
            driveType: null,
            tireSizes: ["225/45 R17"],
            auflagenCodes: [],
          },
        ],
      },
      { auflagenCodes: [], auflagenNotes: null },
    );

    expect(missingAbeCoreHuntFields(report)).not.toContain("verkaufsbezeichnung");
    expect(missingAbeCoreHuntFields(report)).not.toContain("auflagenCodes");
  });

  it("completes core hunt once vehicle table and stammdaten are present", () => {
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
            auflagenCodes: [],
          },
        ],
      },
      { auflagenCodes: [], auflagenNotes: null },
    );

    expect(missingAbeCoreHuntFields(report, "5ER REIHE")).toEqual([]);
  });

  it("merges Auflagen codes into an existing vehicle row on follow-up photos", () => {
    const current = {
      ...emptyAbeDataHunterReport(),
      vehicleMatches: [
        {
          verkaufsbezeichnung: "5ER REIHE",
          fahrzeugtyp: "5L",
          typeApproval: null,
          driveType: null,
          tireSizes: [],
          auflagenCodes: [],
        },
      ],
    };
    const incoming = {
      ...emptyAbeDataHunterReport(),
      vehicleMatches: [
        {
          verkaufsbezeichnung: "5ER REIHE",
          fahrzeugtyp: "5L",
          typeApproval: null,
          driveType: null,
          tireSizes: [],
          auflagenCodes: ["744", "A77"],
        },
      ],
    };

    const merged = fillAbeDataHunterReport(current, incoming);
    expect(merged.vehicleMatches).toHaveLength(1);
    expect(merged.vehicleMatches[0]?.auflagenCodes).toEqual(["744", "A77"]);
  });

  it("fills only empty slots when merging photo results", () => {
    const current = {
      ...emptyAbeDataHunterReport(),
      kbaNumber: "48185",
      auflagenCodes: ["744"],
    };
    const incoming = mergeAbeDataHunterSteps(
      {
        kbaNumber: "99999",
        abeNumber: "48185*08ABC",
        abeHolder: "Alcar",
        manufacturer: "Alcar",
        partDesignation: "Spoiler",
      },
      { markingText: null },
      {
        vehicleMatches: [
          {
            verkaufsbezeichnung: "5ER REIHE",
            fahrzeugtyp: "5L",
            typeApproval: null,
            driveType: null,
            tireSizes: [],
            auflagenCodes: ["A77"],
          },
        ],
      },
      { auflagenCodes: ["A77", "744"], auflagenNotes: null },
    );

    const merged = fillAbeDataHunterReport(current, incoming);
    expect(merged.kbaNumber).toBe("48185");
    expect(merged.abeNumber).toBe("48185*08");
    expect(merged.partDesignation).toBe("Spoiler");
    expect(merged.auflagenCodes).toEqual(["744"]);
    expect(merged.vehicleMatches[0]?.auflagenCodes).toEqual(["A77"]);
  });

  it("keeps the longer Kennzeichnung text when merging photos", () => {
    const current = {
      ...emptyAbeDataHunterReport(),
      markingText: "Prüfplakette",
    };
    const incoming = {
      ...emptyAbeDataHunterReport(),
      markingText:
        "Art der Kennzeichnung: Prüfplakette\nNummer: e1*47656",
    };

    const merged = fillAbeDataHunterReport(current, incoming);
    expect(merged.markingText).toBe(
      "Art der Kennzeichnung: Prüfplakette\nNummer: e1*47656",
    );
  });
});

describe("ABE_HUNT_FIELD_WATERMARKS", () => {
  it("covers every required field with the KBA example first", () => {
    expect(ABE_HUNT_FIELD_WATERMARKS.kbaNumber).toBe("KBA 123456");
    expect(ABE_HUNT_FIELD_WATERMARKS.abeNumber).toBe("123456*8");
    for (const key of Object.keys(ABE_REQUIRED_FIELD_LABELS)) {
      expect(ABE_HUNT_FIELD_WATERMARKS[key as keyof typeof ABE_HUNT_FIELD_WATERMARKS].trim()).not.toBe("");
    }
  });

  it("shows Fahrzeugmodell for verkaufsbezeichnung in the UI", () => {
    expect(abeHuntFieldDisplayLabel("verkaufsbezeichnung")).toBe("Fahrzeugmodell");
    expect(ABE_HUNT_FIELD_WATERMARKS.verkaufsbezeichnung).toContain("Fahrzeugmodell");
    expect(ABE_HUNT_FIELD_SCAN_HINTS.verkaufsbezeichnung?.popupBody).toContain(
      "Tabellenabschnitt",
    );
  });
});
