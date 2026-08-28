import { describe, expect, it } from "vitest";

import {
  ABE_VEHICLE_TABLE_WATERMARK_COLUMNS,
  buildAbeVehicleTableExcerptRow,
  formatAbeVehicleTableCaption,
} from "@/components/documents/abe-vehicle-table-watermark";

describe("ABE_VEHICLE_TABLE_WATERMARK_COLUMNS", () => {
  it("lists Fahrzeugtyp first, then both Auflagen columns on the right", () => {
    expect(ABE_VEHICLE_TABLE_WATERMARK_COLUMNS).toEqual([
      "Fahrzeugtyp",
      "Betriebserlaubnis",
      "kW",
      "Reifen",
      "Reifen-Aufl.",
      "Aufl. u. Hinw.",
    ]);
  });
});

describe("buildAbeVehicleTableExcerptRow", () => {
  it("fills the relevant row from the garage vehicle", () => {
    expect(
      buildAbeVehicleTableExcerptRow({
        brand: "BMW",
        model: "5er",
        type: "5L",
        egBe: "e1*2007/46*0508*00",
      }),
    ).toEqual(["5L", "e1*2007/46*0…", "kW", "Reifen", "10B", "A01"]);
  });
});

describe("formatAbeVehicleTableCaption", () => {
  it("uses brand and model as the excerpt caption", () => {
    expect(
      formatAbeVehicleTableCaption({ brand: "BMW", model: "5er" }),
    ).toBe("BMW 5er");
  });
});
