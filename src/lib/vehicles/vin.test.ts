import { describe, expect, it } from "vitest";

import { parseEinzelabnahmeField22Meta } from "@/lib/documents/einzelabnahme-field22-meta";
import { isPlausibleVin, normalizeVinForStorage, verifyVinMatch } from "@/lib/vehicles/vin";

describe("isPlausibleVin", () => {
  it("accepts a valid 17-char VIN", () => {
    expect(isPlausibleVin("2TM00010400000001")).toBe(true);
  });

  it("rejects junk garage placeholder VINs", () => {
    expect(isPlausibleVin("2347184NDSFJSFJSF")).toBe(false);
  });

  it("rejects short values", () => {
    expect(isPlausibleVin("2TM000104")).toBe(false);
  });
});

describe("normalizeVinForStorage", () => {
  it("returns null for invalid VINs instead of storing junk", () => {
    expect(normalizeVinForStorage("2347184NDSFJSFJSF")).toBeNull();
    expect(normalizeVinForStorage("")).toBeNull();
    expect(normalizeVinForStorage("2TM00010400000001")).toBe("2TM00010400000001");
  });
});

describe("verifyVinMatch", () => {
  it("does not match when garage VIN is invalid", () => {
    expect(verifyVinMatch("2TM00010400000001", "2347184NDSFJSFJSF")).toBe(
      false,
    );
  });
});

describe("parseEinzelabnahmeField22Meta", () => {
  it("extracts KM-Stand and Prüfer from Feld 22 prose", () => {
    const meta = parseEinzelabnahmeField22Meta(`
      Prüfer: Max Mustermann
      KM-Stand: 142.350 km
      Sportfedern eingebaut
    `);
    expect(meta.mileageKm).toBe(142_350);
    expect(meta.officialExpert).toMatch(/Mustermann/i);
  });
});
