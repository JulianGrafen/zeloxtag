import { describe, expect, it } from "vitest";

import { extractTeilegutachtenCompatibilityTableFromText } from "@/lib/ocr/teilegutachten-compatibility-from-text";
import { vehicleApprovalsFromSanitizedTable } from "@/lib/validations/teilegutachten-compatibility-table";

describe("extractTeilegutachtenCompatibilityTableFromText", () => {
  it("parses pipe OCR table with Rover split headers", () => {
    const text = `
I. Verwendungsbereich | Fahrzeugher- steller | Fahrzeug- typ | Handels- bezeichnung | ABE-Nr.
| --- | --- | --- | --- | --- |
| Rover (GB) | HW | Concerto | F 340 |
| [2055] | XW | Rover 214, 216 | F 377 |
II. Technische Daten
`;

    const table = extractTeilegutachtenCompatibilityTableFromText(text);

    expect(table?.headers).toEqual([
      "Fahrzeugher- steller",
      "Fahrzeug- typ",
      "Handels- bezeichnung",
      "ABE-Nr.",
    ]);
    expect(table?.rows).toHaveLength(2);
    expect(table?.rows[0]?.cells[0]).toBe("Rover (GB)");
    expect(vehicleApprovalsFromSanitizedTable(table)).toEqual([
      "Rover (GB) · HW · Concerto",
      "Rover (GB) · XW · Rover 214, 216",
    ]);
  });

  it("parses BMW (D) pipe OCR table", () => {
    const text = `
I. Verwendungsbereich | Fahrzeugher- steller | Fahrzeug- typ | Handels- bezeichnung
| BMW (D) | GG | 320i |
| BMW (D) | GG | 330d |
III. Hinweise für den Fahrzeughalter
`;

    const table = extractTeilegutachtenCompatibilityTableFromText(text);

    expect(vehicleApprovalsFromSanitizedTable(table)).toEqual([
      "BMW (D) · GG · 320i",
      "BMW (D) · GG · 330d",
    ]);
  });

  it("parses VW and Mercedes pipe OCR rows", () => {
    const text = `
Verwendungsbereich | Fahrzeugher- steller | Typschlüs- sel | Handels- bezeichnung
| Volkswagen (D) | 5G | Golf VII |
| Mercedes-Benz (D) | W205 | C 200 |
IV. Auflagen
`;

    const table = extractTeilegutachtenCompatibilityTableFromText(text);

    expect(vehicleApprovalsFromSanitizedTable(table)).toEqual([
      "Volkswagen (D) · 5G · Golf VII",
      "Mercedes-Benz (D) · W205 · C 200",
    ]);
  });

  it("returns null when no pipe table is present", () => {
    expect(
      extractTeilegutachtenCompatibilityTableFromText(
        "Verwendungsbereich:\nMazda RX-8 (SE3P)",
      ),
    ).toBeNull();
  });
});
