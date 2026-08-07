import { describe, expect, it } from "vitest";

import {
  abeVehicleMatchIndexFromRowId,
  findBestAbeVehicleMatchIndex,
  formatAbeVehicleApprovalLine,
  resolveInitialAbeVehicleMatchIndex,
  scoreAbeVehicleMatch,
  vehicleMatchesToTableData,
} from "@/lib/ocr/abe-wizard-vehicle-match";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

const MATCHES: AbeVehicleMatch[] = [
  {
    model: "5ER REIHE",
    typeApproval: "e1*2007/46*0508*0508*0000*00",
    driveType: "Allradantrieb",
    tireSizes: ["245/45R18"],
    auflagenCodes: ["10B", "BEN"],
  },
  {
    model: "5ER REIHE",
    typeApproval: "e1*2007/46*0508*0508*0000*00",
    driveType: "Heckantrieb",
    tireSizes: ["225/50R18"],
    auflagenCodes: ["11B", "4DA"],
  },
  {
    model: "6ER REIHE",
    typeApproval: "e1*2007/46*0363*0363*00",
    driveType: "Heckantrieb",
    tireSizes: ["255/40R19"],
    auflagenCodes: ["721"],
  },
];

describe("abe-wizard-vehicle-match", () => {
  it("scores BMW 5er rows higher than 6er", () => {
    const vehicle = { brand: "BMW", model: "5er" };
    expect(scoreAbeVehicleMatch(MATCHES[0]!, vehicle)).toBeGreaterThan(
      scoreAbeVehicleMatch(MATCHES[2]!, vehicle),
    );
  });

  it("auto-selects the best matching row", () => {
    expect(
      findBestAbeVehicleMatchIndex(MATCHES, { brand: "BMW", model: "5er" }),
    ).toBe(0);
  });

  it("auto-selects when only one row exists", () => {
    expect(resolveInitialAbeVehicleMatchIndex([MATCHES[0]!], null)).toBe(0);
  });

  it("formats approval line with drive type and tyres", () => {
    expect(formatAbeVehicleApprovalLine(MATCHES[1]!)).toBe(
      "5ER REIHE (Heckantrieb) – 225/50R18",
    );
  });

  it("maps wizard matches to selectable table rows", () => {
    const table = vehicleMatchesToTableData(MATCHES, 1, {
      brand: "BMW",
      model: "5er",
    });
    expect(table.rows).toHaveLength(3);
    expect(table.rows[1]?.isUserVehicleMatch).toBe(true);
    expect(abeVehicleMatchIndexFromRowId("abe-match-2")).toBe(2);
  });
});
