import { describe, expect, it } from "vitest";

import {
  ABE_HUNT_FIELD_SCAN_HINTS,
  ABE_HUNT_FIELD_WATERMARKS,
  ABE_REQUIRED_FIELD_LABELS,
  abeHuntFieldDisplayLabel,
  coalesceAbeHolderAndManufacturer,
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
import { inferAbeKbaFromReport } from "@/lib/validations/abeSchema";

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

  it("requires Verkaufsbezeichnung and Auflagen for save; Kennzeichnung is optional", () => {
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

    expect(missingAbeRequiredFields(report)).toEqual(["verkaufsbezeichnung"]);
  });

  it("does not require Kennzeichnung for core hunt or save", () => {
    const report = mergeAbeDataHunterSteps(
      completeStammdaten,
      { markingText: null },
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
      { auflagenCodes: [], auflagenNotes: "744: Montage nur mit …" },
    );

    expect(missingAbeCoreHuntFields(report, "5ER REIHE")).not.toContain(
      "markingText",
    );
    expect(missingAbeRequiredFields(report, "5ER REIHE")).not.toContain(
      "markingText",
    );
  });

  it("still requires Fahrzeugmodell when only placeholder group label exists", () => {
    const report = mergeAbeDataHunterSteps(
      completeStammdaten,
      { markingText: null },
      {
        vehicleMatches: [
          {
            verkaufsbezeichnung: "Fahrzeugtabelle",
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

    expect(missingAbeCoreHuntFields(report)).toContain("verkaufsbezeichnung");
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

  it("allows save when missing Kürzel were explicitly skipped", () => {
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

    expect(
      missingAbeRequiredFields(report, "5ER REIHE", null, {
        skippedAuflagenCodes: ["F40", "L04"],
      }),
    ).toEqual([]);
  });

  it("allows save when the entire Auflagen scan was skipped", () => {
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
            auflagenCodes: ["744", "F40"],
          },
        ],
      },
      { auflagenCodes: [], auflagenNotes: null },
    );

    expect(
      missingAbeRequiredFields(report, "5ER REIHE", null, {
        auflagenScanSkipped: true,
      }),
    ).toEqual([]);
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

  it("still requires Fahrzeugmodell when only table row data exists without section header", () => {
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

    expect(missingAbeCoreHuntFields(report)).toContain("verkaufsbezeichnung");
    expect(missingAbeCoreHuntFields(report)).not.toContain("auflagenCodes");
  });

  it("accepts garage-matched vehicle table rows as resolved Fahrzeugmodell during hunt", () => {
    const report = mergeAbeDataHunterSteps(
      completeStammdaten,
      { markingText: "Kennzeichnung auf dem Bauteil" },
      {
        vehicleMatches: [
          {
            verkaufsbezeichnung: "Fahrzeugtabelle",
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

    expect(
      missingAbeCoreHuntFields(report, null, {
        brand: "BMW",
        model: "530d",
        type: "5L",
      }),
    ).not.toContain("verkaufsbezeichnung");
  });

  it("completes core hunt once vehicle table and stammdaten are present", () => {
    const report = mergeAbeDataHunterSteps(
      completeStammdaten,
      { markingText: null },
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
    expect(ABE_HUNT_FIELD_WATERMARKS.kbaNumber).toContain("48571");
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

describe("coalesceAbeHolderAndManufacturer", () => {
  it("mirrors holder to manufacturer when combined on the ABE", () => {
    const report = coalesceAbeHolderAndManufacturer({
      ...emptyAbeDataHunterReport(),
      abeHolder: "Alcar Leichtmetallräder GmbH",
      manufacturer: null,
    });
    expect(report.manufacturer).toBe("Alcar Leichtmetallräder GmbH");
  });

  it("mirrors manufacturer to holder when only Hersteller was extracted", () => {
    const report = coalesceAbeHolderAndManufacturer({
      ...emptyAbeDataHunterReport(),
      abeHolder: null,
      manufacturer: "BBS Kraftfahrzeugtechnik AG",
    });
    expect(report.abeHolder).toBe("BBS Kraftfahrzeugtechnik AG");
  });

  it("applies during fillAbeDataHunterReport merge", () => {
    const merged = fillAbeDataHunterReport(emptyAbeDataHunterReport(), {
      ...emptyAbeDataHunterReport(),
      abeHolder: "Muster Tuning GmbH",
    });
    expect(merged.manufacturer).toBe("Muster Tuning GmbH");
  });
});

describe("inferAbeKbaFromReport", () => {
  it("infers KBA digits from Nummer der ABE", () => {
    expect(
      inferAbeKbaFromReport({
        abeNumber: "48185*08",
      }),
    ).toBe("48185");
  });

  it("infers KBA from Kennzeichnung Nummer line", () => {
    expect(
      inferAbeKbaFromReport({
        markingText: "Art der Kennzeichnung: Prüfplakette\nNummer: 48185",
      }),
    ).toBe("48185");
  });

  it("infers KBA from Gutachten zur ABE Nr. heading", () => {
    expect(
      inferAbeKbaFromReport({
        partDesignation: "Gutachten zur ABE Nr. 48571 nach §22 StVZO",
      }),
    ).toBe("48571");
  });

  it("infers KBA from KBA-Nummer label in Kennzeichnungen", () => {
    expect(
      inferAbeKbaFromReport({
        markingText: "KBA-Nummer: 48571\nHerstellerzeichen: PLATIN GERMANY",
      }),
    ).toBe("48571");
  });

  it("clears kbaNumber from missing fields after merge via abeNumber", () => {
    const merged = fillAbeDataHunterReport(emptyAbeDataHunterReport(), {
      ...emptyAbeDataHunterReport(),
      abeNumber: "48185*08",
    });
    expect(merged.kbaNumber).toBe("48185");
    expect(missingAbeCoreHuntFields(merged)).not.toContain("kbaNumber");
  });
});
