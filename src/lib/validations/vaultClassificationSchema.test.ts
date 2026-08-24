import { describe, expect, it } from "vitest";

import {
  normalizeVaultClassification,
  VAULT_CATEGORY_LABELS,
} from "@/lib/validations/vaultClassificationSchema";

describe("vaultClassificationSchema", () => {
  it("normalizes LLM payload", () => {
    expect(
      normalizeVaultClassification({
        title: "  KW V3 Gewindefahrwerk  ",
        category: "FAHRWERK",
        documentKind: "teilegutachten",
      }),
    ).toEqual({
      title: "KW V3 Gewindefahrwerk",
      category: "FAHRWERK",
      documentKind: "teilegutachten",
    });
  });

  it("defaults missing documentKind to null", () => {
    expect(
      normalizeVaultClassification({
        title: "Maxton Heckspoiler",
        category: "AERODYNAMIK_KAROSSERIE",
        documentKind: null,
      }),
    ).toEqual({
      title: "Maxton Heckspoiler",
      category: "AERODYNAMIK_KAROSSERIE",
      documentKind: null,
    });
  });

  it("exposes German labels for every category", () => {
    expect(VAULT_CATEGORY_LABELS.RÄDER_FELGEN).toBe("Felgen");
    expect(VAULT_CATEGORY_LABELS.MOTOR_ABGAS_ANSAUGUNG).toBe("Motor & Auspuff");
  });
});
