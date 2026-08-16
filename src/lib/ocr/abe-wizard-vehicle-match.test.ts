import { describe, expect, it } from "vitest";

import {
  displayAbeVehicleModelOptionLabel,
  displayAbeVehicleVariantOptionLabel,
  findBestAbeVehicleGroupIndex,
  findSuggestedAbeVehicleVariant,
  listAbeVehicleVariantOptions,
  formatAbeVehicleApprovalLine,
  groupAbeVehicleMatches,
  auflagenForUserVehicleSelection,
  requiresAbeVehicleGroupSelection,
  resolveAuflagenCodesForReport,
  resolveInitialAbeVehicleGroupIndex,
  scoreAbeVehicleGroup,
  vehicleGroupRowsToTableData,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

const MATCHES: AbeVehicleMatch[] = [
  {
    verkaufsbezeichnung: "5ER REIHE",
    fahrzeugtyp: "3k-N1",
    typeApproval: "e1*2007/46*0508*0508*0000*00",
    driveType: "Allradantrieb",
    tireSizes: ["245/45R18"],
    auflagenCodes: ["744", "A77"],
  },
  {
    verkaufsbezeichnung: "5ER REIHE",
    fahrzeugtyp: "5L",
    typeApproval: "e1*2007/46*0508*0508*0000*00",
    driveType: "Heckantrieb",
    tireSizes: ["225/50R18"],
    auflagenCodes: ["744", "20B"],
  },
  {
    verkaufsbezeichnung: "6ER REIHE",
    fahrzeugtyp: "6C",
    typeApproval: "e1*2007/46*0363*0363*00",
    driveType: "Heckantrieb",
    tireSizes: ["255/40R19"],
    auflagenCodes: ["721"],
  },
];

describe("abe-wizard-vehicle-match", () => {
  it("groups rows by Verkaufsbezeichnung", () => {
    const groups = groupAbeVehicleMatches(MATCHES);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.verkaufsbezeichnung).toBe("5ER REIHE");
    expect(groups[0]?.rows).toHaveLength(2);
  });

  it("scores BMW 5er group higher than 6er", () => {
    const groups = groupAbeVehicleMatches(MATCHES);
    const vehicle = { brand: "BMW", model: "5er" };
    expect(scoreAbeVehicleGroup(groups[0]!, vehicle)).toBeGreaterThan(
      scoreAbeVehicleGroup(groups[1]!, vehicle),
    );
  });

  it("auto-selects the best matching group", () => {
    const groups = groupAbeVehicleMatches(MATCHES);
    expect(
      findBestAbeVehicleGroupIndex(groups, { brand: "BMW", model: "5er" }),
    ).toBe(0);
  });

  it("auto-selects when only one group exists", () => {
    const groups = groupAbeVehicleMatches([MATCHES[0]!]);
    expect(resolveInitialAbeVehicleGroupIndex(groups)).toBe(0);
  });

  it("falls back to the first group during hunt when multiple groups exist and no garage match", () => {
    const groups = groupAbeVehicleMatches(MATCHES);
    expect(resolveInitialAbeVehicleGroupIndex(groups)).toBeNull();
    expect(requiresAbeVehicleGroupSelection(groups)).toBe(true);
  });

  it("prefers the garage vehicle match when auto-selecting a group", () => {
    const groups = groupAbeVehicleMatches(MATCHES);
    expect(
      resolveInitialAbeVehicleGroupIndex(groups, {
        brand: "BMW",
        model: "6er",
      }),
    ).toBe(1);
  });

  it("auto-selects BMW 520d against 5ER REIHE", () => {
    const groups = groupAbeVehicleMatches(MATCHES);
    expect(
      resolveInitialAbeVehicleGroupIndex(groups, {
        brand: "BMW",
        model: "520d",
      }),
    ).toBe(0);
  });

  it("merges Verkaufsbezeichnung variants with different comma spacing", () => {
    const groups = groupAbeVehicleMatches([
      {
        ...MATCHES[0]!,
        verkaufsbezeichnung: "5ER REIHE, GRAN TURISMO",
      },
      {
        ...MATCHES[1]!,
        verkaufsbezeichnung: "5ER REIHE,GRAN TURISMO",
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.verkaufsbezeichnung).toBe("5ER REIHE, GRAN TURISMO");
    expect(groups[0]?.rows).toHaveLength(2);
  });

  it("maps a group to a full table", () => {
    const groups = groupAbeVehicleMatches(MATCHES);
    const table = vehicleGroupRowsToTableData(groups[0]!);
    expect(table.rows).toHaveLength(2);
    expect(table.caption).toBe("5ER REIHE");
  });

  it("formats legacy approval line", () => {
    expect(formatAbeVehicleApprovalLine(MATCHES[1]!)).toBe(
      "5ER REIHE (Heckantrieb) – 225/50R18",
    );
  });

  it("returns Auflagen only for the selected vehicle group", () => {
    const report = {
      auflagenCodes: ["721", "744", "A77", "20B"],
      vehicleMatches: MATCHES,
    };

    expect(
      resolveAuflagenCodesForReport(report, {
        selectedVerkaufsbezeichnung: "6ER REIHE",
      }),
    ).toEqual(["721"]);

    expect(
      resolveAuflagenCodesForReport(report, {
        selectedVerkaufsbezeichnung: "5ER REIHE",
      }),
    ).toEqual(["744", "A77", "20B"]);
  });

  it("scopes Auflagen to the garage-matched row within a group", () => {
    const report = {
      auflagenCodes: ["721", "744", "A77", "20B"],
      vehicleMatches: MATCHES,
    };

    expect(
      resolveAuflagenCodesForReport(report, {
        selectedVerkaufsbezeichnung: "5ER REIHE",
        vehicleContext: { brand: "BMW", model: "5er", type: "5L" },
      }),
    ).toEqual(["744", "20B"]);
  });

  it("returns Auflagen only for the selected vehicle row", () => {
    const report = {
      auflagenCodes: ["721", "744", "A77", "20B"],
      vehicleMatches: MATCHES,
    };

    expect(
      auflagenForUserVehicleSelection(report, 0, "abe-row-1"),
    ).toEqual(["744", "20B"]);
    expect(auflagenForUserVehicleSelection(report, 0, null)).toEqual([]);
  });

  it("lists flat vehicle variant options with model and Fahrzeugtyp", () => {
    const options = listAbeVehicleVariantOptions(MATCHES);
    expect(options.length).toBe(3);
    expect(options.some((option) => option.label.includes("346K"))).toBe(false);
    expect(options.some((option) => option.label.includes("3k-N1"))).toBe(
      true,
    );
    expect(displayAbeVehicleVariantOptionLabel("BMW 3er-Reihe", MATCHES[2]!)).toBe(
      "BMW 3er-Reihe · 6C",
    );
  });

  it("lists rows with Fahrzeugtyp or EG-BE and merges fragment model headers", () => {
    const options = listAbeVehicleVariantOptions([
      {
        verkaufsbezeichnung: "BMW 3er-Reihe",
        fahrzeugtyp: "346L",
        typeApproval: "e1*97/27*0097*",
        driveType: null,
        tireSizes: ["225/45R17"],
        auflagenCodes: ["A01"],
      },
      {
        verkaufsbezeichnung: "-Compact",
        fahrzeugtyp: "346K",
        typeApproval: "e1*98/14*0167*",
        driveType: null,
        tireSizes: ["215/45R17"],
        auflagenCodes: ["A02"],
      },
      {
        verkaufsbezeichnung: "BMW 1er-Reihe",
        fahrzeugtyp: null,
        typeApproval: "e1*2007/46*0001*",
        driveType: null,
        tireSizes: ["215/45R17"],
        auflagenCodes: ["744"],
      },
    ]);

    expect(options).toHaveLength(3);
    expect(options.map((option) => option.label)).toEqual([
      "BMW 3er-Reihe · 346L",
      "BMW 3er-Compact · 346K",
      "BMW 1er-Reihe",
    ]);
  });

  it("shows short model labels without manufacturer prefix", () => {
    expect(displayAbeVehicleModelOptionLabel("BMW 3er-Reihe")).toBe(
      "3er-Reihe",
    );
    expect(displayAbeVehicleModelOptionLabel("5ER REIHE")).toBe("5ER REIHE");
  });

  it("does not suggest a 3er type just because the garage is a BMW 3er", () => {
    const suggested = findSuggestedAbeVehicleVariant(
      [
        {
          verkaufsbezeichnung: "BMW 3er-Reihe",
          fahrzeugtyp: "346L",
          typeApproval: "e1*97/27*0097*",
          driveType: null,
          tireSizes: ["225/45R17"],
          auflagenCodes: ["A01"],
        },
        {
          verkaufsbezeichnung: "Golf",
          fahrzeugtyp: "1K",
          typeApproval: "e1*2001/116*0242*",
          driveType: null,
          tireSizes: ["205/55R16"],
          auflagenCodes: ["744"],
        },
      ],
      { brand: "BMW", model: "320d", type: "1K" },
    );

    expect(suggested).toEqual({ groupIndex: 1, rowIndex: 0 });
  });

  it("does not auto-suggest when the garage type is not in the table", () => {
    expect(
      findSuggestedAbeVehicleVariant(
        [
          {
            verkaufsbezeichnung: "BMW 3er-Reihe",
            fahrzeugtyp: "346L",
            typeApproval: "e1*97/27*0097*",
            driveType: null,
            tireSizes: ["225/45R17"],
            auflagenCodes: ["A01"],
          },
        ],
        { brand: "BMW", model: "320d", type: "390" },
      ),
    ).toBeNull();
  });

  it("does not return unscoped top-level Auflagen when groups exist", () => {
    const report = {
      auflagenCodes: ["999", "888"],
      vehicleMatches: MATCHES,
    };

    expect(resolveAuflagenCodesForReport(report)).toEqual([]);
  });
});
