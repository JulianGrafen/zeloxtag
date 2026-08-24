import { describe, expect, it } from "vitest";

import {
  enrichTeilegutachtenCoverFromOcr,
  extractTeilegutachtenArtDerUmruestungFromText,
  extractTeilegutachtenFahrzeugteilFromText,
  extractTeilegutachtenFuerFzTypenFromText,
  extractTeilegutachtenHerstellerFromText,
  extractTeilegutachtenPartTypeFromText,
  vehicleApprovalsFromFuerFzTypen,
} from "@/lib/ocr/teilegutachten-cover-from-text";
import {
  coverHasAuflagen,
  coverHasVehicleScope,
  nextTeilegutachtenWizardPhaseAfterAuflagen,
  nextTeilegutachtenWizardPhaseAfterMarking,
  nextTeilegutachtenWizardPhaseAfterTechnical,
} from "@/lib/documents/teilegutachten-wizard-routing";

const COVER = `
TEILEGUTACHTEN
nach § 19 Abs. 3 StVZO

Fahrzeugteil:
Sportfedern VA/HA
für Tieferlegung

Fz.-Teile Type: Eibach Pro-Kit 21-85-041-01

Für Fz-Typen:
BMW 3er E46 320i
BMW 3er E46 328i

Hersteller: Eibach GmbH
Gutachten-Nr.: 14-00123-CP-GBM
`.trim();

const COVER_WITH_UMRUESTUNG = `
TEILEGUTACHTEN
nach § 19 Abs. 3 StVZO

Fahrzeugteil:
Sportfedern VA/HA

Art der Umrüstung:
Tieferlegung durch Sportfedern

Fz.-Teile Type: Eibach Pro-Kit 21-85-041-01

Für Fz-Typen:
BMW 3er E46 320i

Hersteller: Eibach GmbH
`.trim();

describe("teilegutachten cover OCR heuristics", () => {
  it("extracts labeled cover fields", () => {
    expect(extractTeilegutachtenFahrzeugteilFromText(COVER)).toContain(
      "Sportfedern",
    );
    expect(extractTeilegutachtenPartTypeFromText(COVER)).toBe(
      "Eibach Pro-Kit 21-85-041-01",
    );
    expect(extractTeilegutachtenHerstellerFromText(COVER)).toBe("Eibach GmbH");
    expect(extractTeilegutachtenFuerFzTypenFromText(COVER)).toContain("BMW");
    expect(vehicleApprovalsFromFuerFzTypen("BMW 3er E46 320i")).toEqual([
      "BMW 3er E46 320i",
    ]);
  });

  it("extracts Art der Umrüstung and merges with Fahrzeugteil on cover", () => {
    expect(extractTeilegutachtenArtDerUmruestungFromText(COVER_WITH_UMRUESTUNG)).toBe(
      "Tieferlegung durch Sportfedern",
    );

    const enriched = enrichTeilegutachtenCoverFromOcr(
      {
        documentType: "Teilegutachten",
        requiresPhysicalInspection: true,
        certificateNumber: null,
        issueDate: null,
        manufacturer: null,
        modificationType: null,
        partCategory: null,
        partType: null,
        physicalMarking: null,
        markingType: null,
        markingNumber: null,
        testingOrganization: null,
        verwendungsbereich: null,
        compatibilityTable: null,
        auflagen: null,
        ownerNotes: null,
        technicalDataTable: null,
        userVehicleMatchStatus: null,
        matchedVehicleRow: null,
      },
      COVER_WITH_UMRUESTUNG,
    );

    expect(enriched.modificationType).toContain("Sportfedern VA/HA");
    expect(enriched.modificationType).toContain("Tieferlegung durch Sportfedern");
  });

  it("routes marking then auflagen, optional technical, then Verwendungsbereich last", () => {
    expect(nextTeilegutachtenWizardPhaseAfterMarking()).toBe("capture-auflagen");
    expect(nextTeilegutachtenWizardPhaseAfterAuflagen()).toBe(
      "capture-technical-prompt",
    );
    expect(nextTeilegutachtenWizardPhaseAfterTechnical()).toBe(
      "capture-verwendungsbereich",
    );

    const fields = {
      vendor: "Eibach Pro-Kit",
      date: null,
      amount: null,
      category: "abe" as const,
      summary: null,
      lineItems: null,
      kbaNumber: "14-00123-CP-GBM",
      vehicleApprovals: ["BMW 3er E46 328i"],
      authority: "TÜV Süd",
      conditions: null,
      partCategory: "Sportfedern VA/HA",
      notes: null,
      manufacturer: "Eibach GmbH",
      invoiceNumber: "14-00123-CP-GBM",
      mileageKm: null,
    };

    expect(coverHasVehicleScope(fields, null)).toBe(true);
    expect(
      coverHasAuflagen(
        {
          vendor: null,
          date: null,
          amount: null,
          category: "abe",
          summary: null,
          lineItems: null,
          kbaNumber: null,
          vehicleApprovals: null,
          authority: null,
          conditions: ["Sichtprüfung"],
          partCategory: null,
          notes: null,
          manufacturer: null,
          invoiceNumber: null,
          mileageKm: null,
        },
        null,
      ),
    ).toBe(true);
  });
});
