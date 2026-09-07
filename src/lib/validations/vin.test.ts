import { describe, expect, it } from "vitest";

import { coerceVinForStorage, extractPlausibleVin, isPlausibleVin } from "@/lib/validations/vin";

describe("vin validation", () => {
  it("accepts valid ISO 3779 VINs", () => {
    expect(isPlausibleVin("1HGBH41JXMN109186")).toBe(true);
  });

  it("rejects OCR garbage", () => {
    expect(isPlausibleVin("ABCDEFGH123456789")).toBe(false);
    expect(isPlausibleVin("VERTRAGSWERKSTATT")).toBe(false);
    expect(isPlausibleVin("2347184NDSFJSFJSF")).toBe(false);
    expect(extractPlausibleVin("FIN ABCDEFGH123456789 auf dem Beleg")).toBeNull();
    expect(
      extractPlausibleVin("Vertragswerkstatt VERTRAGSWERKSTATT Service"),
    ).toBeNull();
  });

  it("coerces partial VINs for storage without blocking saves", () => {
    expect(coerceVinForStorage("")).toBeNull();
    expect(coerceVinForStorage("  ")).toBeNull();
    expect(coerceVinForStorage("1HGBH41JXMN109186")).toBe("1HGBH41JXMN109186");
    expect(coerceVinForStorage("teil-fin-123")).toBe("TEIL-FIN-123");
    expect(coerceVinForStorage("a".repeat(40))).toHaveLength(32);
  });
});
