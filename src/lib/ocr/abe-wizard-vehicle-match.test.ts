import { describe, expect, it } from "vitest";

import {
  findBestAbeVehicleGroupIndex,
  formatAbeVehicleApprovalLine,
  groupAbeVehicleMatches,
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
    expect(resolveInitialAbeVehicleGroupIndex(groups, null)).toBe(0);
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
});
