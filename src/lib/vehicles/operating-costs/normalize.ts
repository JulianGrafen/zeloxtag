import type {
  OperatingCostBillingPeriod,
  OperatingCostCategory,
} from "@/types/database";

import type { OperatingCostFormInput } from "./types";

export type NormalizedOperatingCostInput = {
  category: OperatingCostCategory;
  amountEur: number;
  occurredOn: string;
  billingPeriod: OperatingCostBillingPeriod;
  note: string | null;
  fuelLiters: number | null;
  odometerKm: number | null;
};

function parseAmount(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

function parseOptionalPositive(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function parseOptionalKm(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime());
}

export function normalizeOperatingCostInput(
  input: OperatingCostFormInput,
): { ok: true; value: NormalizedOperatingCostInput } | { ok: false; message: string } {
  const category = input.category;
  if (!["fuel", "insurance", "tax", "other"].includes(category)) {
    return { ok: false, message: "Ungültige Kategorie." };
  }

  const amountEur = parseAmount(input.amountEur);
  if (amountEur == null) {
    return { ok: false, message: "Bitte einen gültigen Betrag eingeben." };
  }

  const occurredOn = input.occurredOn.trim();
  if (!isValidIsoDate(occurredOn)) {
    return { ok: false, message: "Bitte ein gültiges Datum wählen." };
  }

  const billingPeriod = input.billingPeriod;
  if (!["once", "monthly", "yearly"].includes(billingPeriod)) {
    return { ok: false, message: "Ungültiger Abrechnungszeitraum." };
  }

  if (category === "fuel" && billingPeriod !== "once") {
    return { ok: false, message: "Tankungen sind immer einmalige Einträge." };
  }

  const fuelLiters =
    category === "fuel" ? parseOptionalPositive(input.fuelLiters) : null;
  const odometerKm =
    category === "fuel" ? parseOptionalKm(input.odometerKm) : null;

  if (category === "fuel" && odometerKm == null) {
    return { ok: false, message: "Bitte den Kilometerstand eingeben." };
  }

  const note = input.note?.trim() || null;

  return {
    ok: true,
    value: {
      category,
      amountEur,
      occurredOn,
      billingPeriod,
      note,
      fuelLiters,
      odometerKm,
    },
  };
}
