import { describe, expect, it } from "vitest";

import { extractPlausibleVin, isPlausibleVin } from "@/lib/validations/vin";

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
});
