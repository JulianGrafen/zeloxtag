import { describe, expect, it } from "vitest";

import {
  htmlToPlainText,
  normalizePlannedModExtractRaw,
} from "@/lib/build-planner/normalize-extract";
import { parsePlannedModExtractResult } from "@/lib/build-planner/extract-schema";

describe("normalizePlannedModExtractRaw", () => {
  it("coerces invalid productUrl and category", () => {
    const normalized = normalizePlannedModExtractRaw({
      part: {
        title: "Coilovers",
        manufacturer: null,
        category: "not_a_bucket",
        plannedPriceEur: 1200,
        productUrl: "not-a-url",
      },
      todos: [
        { title: "Einbau", sortOrder: 0 },
        { title: "Achsvermessung", sortOrder: 1 },
        { title: "Probe fahren", sortOrder: 2 },
      ],
      confidence: "medium",
      warnings: [],
    });

    const parsed = parsePlannedModExtractResult(normalized);
    expect(parsed?.part.productUrl).toBeNull();
    expect(parsed?.part.category).toBeNull();
  });

  it("maps flat copilot JSON (title, estimated_price, performance)", () => {
    const parsed = parsePlannedModExtractResult({
      title: "Stage 3 Performance Upgrade (ca. 400 PS)",
      category: "performance",
      estimated_price: 3800,
      todos: [
        "Upgrade-Turbolader (Stage 2/3 Hybrid)",
        "Upgrade-Ladeluftkühler",
        "Downpipe / Abgasseite",
        "Getriebesoftware (xHP Stage 3)",
        "ECU-Kennfeld auf dem Prüfstand",
      ],
    });

    expect(parsed?.part.title).toContain("400");
    expect(parsed?.part.plannedPriceEur).toBe(3800);
    expect(parsed?.part.category).toBe("engine_exhaust");
    expect(parsed?.todos.length).toBeGreaterThanOrEqual(3);
    expect(parsed?.warnings).toEqual([]);
  });

  it("maps build goals without part object", () => {
    const parsed = parsePlannedModExtractResult({
      goal: "Leistungssteigerung auf ca. 400 PS",
      todos: [
        "Ist-Leistung messen",
        "Stage-2 Konzept (Ladeluft, Abgas, Software)",
        "Einbau und Abgastest",
        "Dokumentation für TÜV",
      ],
      confidence: "medium",
      warnings: ["Kosten variieren stark"],
    });

    expect(parsed?.part.title).toContain("400");
    expect(parsed?.part.category).toBe("engine_exhaust");
    expect(parsed?.todos.length).toBeGreaterThanOrEqual(3);
  });

  it("pads short todo lists and parses German prices", () => {
    const parsed = parsePlannedModExtractResult({
      part: {
        title: "KW",
        manufacturer: null,
        category: "fahrwerk",
        plannedPriceEur: "1.899,00 €",
        productUrl: null,
      },
      todos: [{ title: "Einbau", sortOrder: 0 }],
      confidence: "hoch",
      warnings: [""],
    });

    expect(parsed?.part.title.length).toBeGreaterThanOrEqual(2);
    expect(parsed?.part.plannedPriceEur).toBe(1899);
    expect(parsed?.part.category).toBe("chassis");
    expect(parsed?.confidence).toBe("high");
    expect(parsed?.todos.length).toBeGreaterThanOrEqual(3);
  });
});

describe("htmlToPlainText", () => {
  it("strips tags from shop HTML", () => {
    const text = htmlToPlainText(
      "<html><body><h1>KW V3</h1><p>Preis 1899 EUR</p></body></html>",
    );
    expect(text).toContain("KW V3");
    expect(text).not.toContain("<h1>");
  });
});
