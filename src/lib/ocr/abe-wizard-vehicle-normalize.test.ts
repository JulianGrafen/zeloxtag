import { describe, expect, it } from "vitest";

import {
  correctFahrzeugtypDigitConfusions,
  dropIncompleteVehicleTableRows,
  expandMultiFahrzeugtypRows,
  filterKnownAuflagenCodes,
  looksLikeAuflagenCode,
  looksLikeEgBeApproval,
  looksLikeFahrzeugtypCode,
  mergeAbeVehicleMatchRows,
  normalizeAbeVehicleMatches,
  parseAbeVehicleRows,
  parseAuflagenCodes,
  recoverFahrzeugtypFromShiftedColumns,
  stripVerkaufsbezeichnungLabel,
} from "@/lib/ocr/abe-wizard-vehicle-normalize";
import type { AbeVehicleMatch } from "@/lib/validations/abeWizardSchemas";

describe("abe-wizard-vehicle-normalize", () => {
  it("detects Fahrzeugtyp codes", () => {
    expect(looksLikeFahrzeugtypCode("3k-N1")).toBe(true);
    expect(looksLikeFahrzeugtypCode("346K")).toBe(true);
    expect(looksLikeFahrzeugtypCode("3/CG")).toBe(true);
    expect(looksLikeFahrzeugtypCode("5ER REIHE")).toBe(false);
  });

  it("detects Auflagen codes", () => {
    expect(looksLikeAuflagenCode("744")).toBe(true);
    expect(looksLikeAuflagenCode("A77")).toBe(true);
    expect(looksLikeAuflagenCode("20B")).toBe(true);
    expect(looksLikeAuflagenCode("F40")).toBe(true);
    expect(looksLikeAuflagenCode("L04")).toBe(true);
    expect(looksLikeAuflagenCode("B04A")).toBe(true);
  });

  it("parses lowercase and punctuated Auflagen tokens", () => {
    expect(parseAuflagenCodes(["744, f40. L04"]).codes).toEqual([
      "744",
      "F40",
      "L04",
    ]);
  });

  it("promotes F40/L04 from Fahrzeugtyp to Auflagen when mis-assigned", () => {
    const normalized = normalizeAbeVehicleMatches([
      {
        verkaufsbezeichnung: "5ER REIHE",
        fahrzeugtyp: "F40",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["744"],
      },
      {
        verkaufsbezeichnung: "5ER REIHE",
        fahrzeugtyp: "L04",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744"],
      },
    ]);

    expect(normalized[0]?.fahrzeugtyp).toBeNull();
    expect(normalized[0]?.auflagenCodes).toContain("F40");
    expect(normalized[1]?.auflagenCodes).toContain("L04");
    expect(normalized[1]?.fahrzeugtyp).toBeNull();
  });

  it("detects EG-BE approvals without treating type codes as EG-BE", () => {
    expect(looksLikeEgBeApproval("e1*2007/46*0508*0000*00")).toBe(true);
    expect(looksLikeEgBeApproval("e1*97/27*0097*")).toBe(true);
    expect(looksLikeEgBeApproval("346L")).toBe(false);
    expect(looksLikeEgBeApproval("3/CG")).toBe(false);
    expect(looksLikeEgBeApproval("5L")).toBe(false);
  });

  it("recovers Fahrzeugtyp when the 5-column crop swaps type and EG-BE", () => {
    const recovered = recoverFahrzeugtypFromShiftedColumns({
      verkaufsbezeichnung: "BMW 3er-Reihe",
      fahrzeugtyp: "e1*97/27*0097*",
      typeApproval: "346L",
      driveType: null,
      tireSizes: ["225/45R17"],
      auflagenCodes: ["A01"],
    });

    expect(recovered.fahrzeugtyp).toBe("346L");
    expect(recovered.typeApproval).toBe("e1*97/27*0097*");
  });

  it("recovers Fahrzeugtyp from the model field or Auflagen when the type column is empty", () => {
    expect(
      recoverFahrzeugtypFromShiftedColumns({
        verkaufsbezeichnung: "346L",
        fahrzeugtyp: "e1*97/27*0097*",
        typeApproval: null,
        driveType: null,
        tireSizes: ["225/45R17"],
        auflagenCodes: ["A01"],
      }).fahrzeugtyp,
    ).toBe("346L");

    expect(
      recoverFahrzeugtypFromShiftedColumns({
        verkaufsbezeichnung: "BMW 3er-Reihe",
        fahrzeugtyp: null,
        typeApproval: "e1*97/27*0097*",
        driveType: null,
        tireSizes: ["225/45R17"],
        auflagenCodes: ["346L", "A01"],
      }).fahrzeugtyp,
    ).toBe("346L");
  });

  it("parses a cropped 5-column table that put Fahrzeugtyp into EG-BE", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "BMW 3er-Reihe",
        fahrzeugtyp: "e1*97/27*0097*",
        typeApproval: "346L",
        tireSizes: ["225/45R17"],
        auflagenCodes: ["A01"],
      },
      {
        verkaufsbezeichnung: "BMW 3er-Reihe",
        fahrzeugtyp: "e1*93/81*0017*",
        typeApproval: "3/CG",
        tireSizes: ["205/50R17"],
        auflagenCodes: ["A02"],
      },
      {
        verkaufsbezeichnung: "5ER REIHE",
        fahrzeugtyp: null,
        typeApproval: "e1*2007/46*0508*0000*00",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["5L", "744"],
      },
      {
        verkaufsbezeichnung: "BMW 3er-Compact",
        fahrzeugtyp: null,
        typeApproval: "e1*98/14*0167*",
        tireSizes: ["215/45R17"],
        auflagenCodes: ["346K", "A02"],
      },
    ]);

    expect(parsed.map((row) => row.fahrzeugtyp)).toEqual([
      "346L",
      "3/CG",
      "5L",
      "346K",
    ]);
  });

  it("keeps short Fahrzeugtyp codes like 5L", () => {
    const normalized = normalizeAbeVehicleMatches([
      {
        verkaufsbezeichnung: "5ER REIHE",
        fahrzeugtyp: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744"],
      },
    ]);

    expect(normalized[0]?.fahrzeugtyp).toBe("5L");
    expect(normalized[0]?.auflagenCodes).toEqual(["744"]);
  });

  it("parses Auflagen codes only", () => {
    expect(parseAuflagenCodes(["744 K41 A01 Allradantrieb"]).codes).toEqual([
      "744",
      "K41",
      "A01",
    ]);
    expect(parseAuflagenCodes(["744 A77 Allradantrieb"]).driveType).toBe(
      "Allradantrieb",
    );
    expect(parseAuflagenCodes(["744 A77 Allradantrieb"]).codes).toEqual([
      "744",
      "A77",
    ]);
  });

  it("keeps every standard table Kürzel including 20B/22B and repairs 228", () => {
    expect(
      parseAuflagenCodes(["11A", "12A", "20B", "228", "51A", "A01", "A02", "744"])
        .codes,
    ).toEqual(["11A", "12A", "20B", "22B", "51A", "A01", "A02", "744"]);
  });

  it("splits packed Auflagen OCR into individual Kürzel", () => {
    expect(parseAuflagenCodes(["11A12A20B22B744"]).codes).toEqual([
      "11A",
      "12A",
      "20B",
      "22B",
      "744",
    ]);
  });

  it("repairs Gutachten column mis-assignments (kW → fahrzeugtyp, Reifen → typeApproval)", () => {
    const normalized = normalizeAbeVehicleMatches([
      {
        verkaufsbezeichnung: "BMW 3er-Reihe",
        fahrzeugtyp: "85-195",
        typeApproval: "225/45R17",
        driveType: null,
        tireSizes: ["K2b K41 K42 A01 A02"],
        auflagenCodes: [],
      },
    ]);

    expect(normalized[0]?.fahrzeugtyp).toBeNull();
    expect(normalized[0]?.typeApproval).toBeNull();
    expect(normalized[0]?.tireSizes).toContain("225/45 R17");
    expect(normalized[0]?.auflagenCodes).toEqual(
      expect.arrayContaining(["K2B", "K41", "A01"]),
    );
  });

  it("carries Verkaufsbezeichnung across rows in a group", () => {
    const input: AbeVehicleMatch[] = [
      {
        verkaufsbezeichnung: "Verkaufsbezeichnung: 5ER REIHE",
        fahrzeugtyp: "3k-N1",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["744", "A77"],
      },
      {
        verkaufsbezeichnung: "",
        fahrzeugtyp: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744", "20B"],
      },
    ];

    const normalized = normalizeAbeVehicleMatches(input);
    expect(stripVerkaufsbezeichnungLabel(normalized[0]!.verkaufsbezeichnung)).toBe(
      "5ER REIHE",
    );
    expect(normalized[1]?.verkaufsbezeichnung).toBe("5ER REIHE");
  });

  it("parses raw LLM rows with legacy model field and empty continuation rows", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "5ER REIHE",
        fahrzeugtyp: "3k-N1",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["744", "A77"],
      },
      {
        verkaufsbezeichnung: "",
        model: "5ER REIHE",
        fahrzeugtyp: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744", "20B"],
      },
    ]);

    expect(parsed.length).toBeGreaterThanOrEqual(2);
    expect(parsed.every((row) => row.verkaufsbezeichnung === "5ER REIHE")).toBe(
      true,
    );
  });

  it("uses fallback group when rows have table data but no header", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "",
        fahrzeugtyp: "3k-N1",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Allradantrieb",
        tireSizes: ["245/45R18"],
        auflagenCodes: ["744", "A77"],
      },
      {
        verkaufsbezeichnung: "",
        fahrzeugtyp: "5L",
        typeApproval: "e1*2007/46*0508*0508*0000*00",
        driveType: "Heckantrieb",
        tireSizes: ["225/50R18"],
        auflagenCodes: ["744", "20B"],
      },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed.every((row) => row.verkaufsbezeichnung === "Fahrzeugtabelle")).toBe(
      true,
    );
  });

  it("reads Reifen / Radgröße from alternate LLM keys", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "3ER REIHE",
        fahrzeugtyp: "3k-N1",
        technischeBezeichnung: "e1*2007/46*0508*0508*0000*00",
        reifen: ["225/45 R17", "245/40 R18"],
        auflagenCodes: ["744"],
      },
    ]);

    expect(parsed[0]?.typeApproval).toBe("e1*2007/46*0508*0508*0000*00");
    expect(parsed[0]?.tireSizes).toEqual(["225/45 R17", "245/40 R18"]);
  });

  it("splits comma-separated tire sizes in a single tireSizes entry", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "3ER REIHE",
        fahrzeugtyp: "346K",
        technischeBezeichnung: "e1*98/14*0167*..",
        tireSizes: ["215/45R17, 225/45R17, 245/40R18"],
        auflagenCodes: ["744"],
      },
    ]);

    expect(parsed[0]?.tireSizes).toEqual([
      "215/45 R17",
      "225/45 R17",
      "245/40 R18",
    ]);
  });

  it("extracts all glued tire sizes from one OCR string", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "BMW 3er-Compact",
        fahrzeugtyp: "346K",
        technischeBezeichnung: "e1*98/14*0167*..",
        tireSizes: ["215/45R17 225/45R17"],
        auflagenCodes: ["K2b"],
      },
    ]);

    expect(parsed[0]?.tireSizes).toEqual(["215/45 R17", "225/45 R17"]);
  });

  it("drops unknown OCR junk codes while keeping numeric Auflagen", () => {
    expect(filterKnownAuflagenCodes(["744", "K7C", "K41", "A01"])).toEqual([
      "744",
      "K41",
      "A01",
    ]);
  });

  it("merges split Auflagen columns from raw LLM rows", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "BMW 3er-Compact",
        fahrzeugtyp: "346K",
        typeApproval: "e1*98/14*0167*..",
        driveType: null,
        tireSizes: ["215/45R17"],
        reifenbezogeneAuflagenCodes: ["K2b", "K41"],
        auflagenUndHinweiseCodes: ["A01", "A02", "744"],
      },
    ]);

    expect(parsed[0]?.auflagenCodes).toEqual(
      expect.arrayContaining(["K2B", "K41", "A01", "A02", "744"]),
    );
  });

  it("merges legacy auflagenCodes with split column fields", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "BMW 3er-Compact",
        fahrzeugtyp: "346K",
        typeApproval: "e1*98/14*0167*..",
        driveType: null,
        tireSizes: ["215/45R17"],
        reifenbezogeneAuflagenCodes: ["K2b"],
        auflagenUndHinweiseCodes: ["A01"],
        auflagenCodes: ["S01"],
      },
    ]);

    expect(parsed[0]?.auflagenCodes).toEqual(
      expect.arrayContaining(["K2B", "A01", "S01"]),
    );
  });

  it("drops vehicle table rows without Fahrzeugtyp or EG-BE", () => {
    const rows = dropIncompleteVehicleTableRows([
      {
        verkaufsbezeichnung: "BMW 1er-Reihe",
        fahrzeugtyp: null,
        typeApproval: null,
        driveType: null,
        tireSizes: ["215/45R17"],
        auflagenCodes: ["A01"],
      },
      {
        verkaufsbezeichnung: "BMW 3er-Compact",
        fahrzeugtyp: "346K",
        typeApproval: null,
        driveType: null,
        tireSizes: ["215/45R17"],
        auflagenCodes: ["A01"],
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.fahrzeugtyp).toBe("346K");
  });

  it("corrects common 3↔8 OCR swaps in Fahrzeugtyp using peer rows", () => {
    const peers = new Set(["346K", "346L", "3/CG"]);
    expect(
      correctFahrzeugtypDigitConfusions("846K", peers, "BMW 3er-Compact 346K"),
    ).toBe("346K");
    expect(
      correctFahrzeugtypDigitConfusions("346K", peers, "BMW 3er-Compact 346K"),
    ).toBe("346K");
  });

  it("splits comma-separated Fahrzeugtyp codes into separate rows", () => {
    const expanded = expandMultiFahrzeugtypRows([
      {
        verkaufsbezeichnung: "BMW 3er-Reihe",
        fahrzeugtyp: "346C, 346R",
        typeApproval: "e1*98/14*0112*",
        driveType: null,
        tireSizes: ["215/45R17"],
        auflagenCodes: ["A01"],
      },
    ]);

    expect(expanded.map((row) => row.fahrzeugtyp)).toEqual(["346C", "346R"]);
  });

  it("parses combined Fahrzeugtyp lines from raw LLM output", () => {
    const parsed = parseAbeVehicleRows([
      {
        handelsbezeichnung: "BMW 3er-Reihe",
        fahrzeugtyp: "346C, 346R",
        technischeBezeichnung: "e1*98/14*0112*",
        reifen: ["215/45R17"],
        auflagenCodes: ["A01"],
      },
      {
        handelsbezeichnung: "BMW 3er-Reihe",
        fahrzeugtyp: "846L",
        technischeBezeichnung: "e1*97/27*0097*",
        reifen: ["225/45R17"],
        auflagenCodes: ["A02"],
      },
    ]);

    expect(parsed.map((row) => row.fahrzeugtyp)).toEqual(
      expect.arrayContaining(["346C", "346R", "846L"]),
    );
  });

  it("merges vehicle rows from primary and retry passes", () => {
    const merged = mergeAbeVehicleMatchRows(
      [
        {
          verkaufsbezeichnung: "BMW 3er-Compact",
          fahrzeugtyp: "346K",
          typeApproval: "e1*98/14*0167*",
          driveType: null,
          tireSizes: ["215/45R17"],
          auflagenCodes: ["A01"],
        },
      ],
      [
        {
          verkaufsbezeichnung: "BMW 3er-Reihe",
          fahrzeugtyp: "3/CG",
          typeApproval: "e1*93/81*0017*",
          driveType: null,
          tireSizes: ["205/50R17"],
          auflagenCodes: ["A02"],
        },
        {
          verkaufsbezeichnung: "BMW 3er-Reihe",
          fahrzeugtyp: "346L",
          typeApproval: "e1*97/27*0097*",
          driveType: null,
          tireSizes: ["225/45R17"],
          auflagenCodes: ["A03"],
        },
      ],
    );

    expect(merged).toHaveLength(3);
  });

  it("merges split OCR model headers like -Reihe and -Compact into full labels", () => {
    const parsed = parseAbeVehicleRows([
      {
        verkaufsbezeichnung: "BMW 3er-Reihe",
        fahrzeugtyp: "346L",
        technischeBezeichnung: "e1*97/27*0097*",
        reifen: ["225/45R17"],
        auflagenCodes: ["A01"],
      },
      {
        verkaufsbezeichnung: "-Compact",
        fahrzeugtyp: "346K",
        technischeBezeichnung: "e1*98/14*0167*",
        reifen: ["215/45R17"],
        auflagenCodes: ["A02"],
      },
      {
        verkaufsbezeichnung: "-Reihe",
        fahrzeugtyp: "3/CG",
        technischeBezeichnung: "e1*93/81*0017*",
        reifen: ["205/50R17"],
        auflagenCodes: ["A03"],
      },
    ]);

    expect(parsed.map((row) => row.verkaufsbezeichnung)).toEqual([
      "BMW 3er-Reihe",
      "BMW 3er-Compact",
      "BMW 3er-Reihe",
    ]);
    expect(parsed.map((row) => row.fahrzeugtyp)).toEqual(["346L", "346K", "3/CG"]);
  });

  it("carries BMW 3er prefix onto fragment headers in raw LLM output", () => {
    const parsed = parseAbeVehicleRows([
      { verkaufsbezeichnung: "BMW 3er", fahrzeugtyp: null, reifen: [] },
      {
        verkaufsbezeichnung: "-Reihe",
        fahrzeugtyp: "346L",
        technischeBezeichnung: "e1*97/27*0097*",
        reifen: ["225/45R17"],
        auflagenCodes: ["A01"],
      },
      {
        verkaufsbezeichnung: "-Compact",
        fahrzeugtyp: "346K",
        technischeBezeichnung: "e1*98/14*0167*",
        reifen: ["215/45R17"],
        auflagenCodes: ["A02"],
      },
    ]);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.verkaufsbezeichnung).toBe("BMW 3er-Reihe");
    expect(parsed[1]?.verkaufsbezeichnung).toBe("BMW 3er-Compact");
  });
});
