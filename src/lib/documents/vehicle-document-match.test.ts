import { describe, expect, it } from "vitest";

import { assessVehicleDocumentMatch } from "@/lib/documents/vehicle-document-match";

describe("assessVehicleDocumentMatch", () => {
  it("ignores Vertragswerkstatt OCR tokens mistaken for a FIN", () => {
    expect(
      assessVehicleDocumentMatch({
        rawText: "BMW Vertragswerkstatt VERTRAGSWERKSTATT Rechnung",
        garageVin: "2347184NDSFJSFJSF",
        garageMake: "BMW",
        garageModel: "530d",
      }),
    ).toMatchObject({ mismatch: false, extractedVin: null });
  });

  it("ignores junk garage VINs even when a real FIN is on the Beleg", () => {
    expect(
      assessVehicleDocumentMatch({
        rawText: "FIN WBAXH5C54BE000002",
        garageVin: "2347184NDSFJSFJSF",
        garageMake: "BMW",
        garageModel: "530d",
      }),
    ).toMatchObject({ mismatch: false });
  });

  it("flags a real FIN conflict against a valid garage VIN", () => {
    const result = assessVehicleDocumentMatch({
      rawText: "FIN WBAXH5C54BE000002",
      garageVin: "1HGBH41JXMN109186",
      garageMake: "BMW",
      garageModel: "530d",
    });
    expect(result.mismatch).toBe(true);
    expect(result.reason).toMatch(/passt nicht/);
  });
});
