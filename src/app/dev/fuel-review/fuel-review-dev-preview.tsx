"use client";

import { useState } from "react";

import { FuelFillFormFields } from "@/components/operating-costs/fuel-fill-form-fields";
import { mapExtractionToFuelFillForm } from "@/lib/fuel-receipt/map-extraction-to-form";
import type { FuelFillFormState } from "@/lib/fuel-receipt/types";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

const MOCK_EXTRACTION = {
  date: "2025-11-14",
  totalAmount: 72.45,
  liters: 38.42,
  pricePerLiter: 1.889,
};

const MOCK_FORM = mapExtractionToFuelFillForm(MOCK_EXTRACTION, {
  occurredOn: MOCK_EXTRACTION.date,
  amountEur: "",
  fuelLiters: "",
  pricePerLiterEur: "",
  odometerKm: "187430",
  note: "Shell V-Power",
});

export function FuelReviewDevPreview() {
  const [form, setForm] = useState<FuelFillFormState>(MOCK_FORM);

  return (
    <div className="min-h-dvh bg-[color:var(--vd-surface)] px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        <header className="space-y-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Dev · Mock
          </p>
          <h1 className="text-[1.15rem] font-semibold text-[color:var(--vd-text)]">
            Tankbeleg-Review nach Scan
          </h1>
          <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
            Porsche 911 · 992 Carrera S
          </p>
        </header>

        <div className="space-y-4">
          <div className="zt-feature-panel overflow-hidden">
            <div
              className="flex max-h-48 min-h-32 items-center justify-center bg-black/5 px-4 py-8 text-center text-[0.78rem] text-[color:var(--vd-muted)]"
              role="img"
              aria-label="Vorschau Tankquittung (Mock)"
            >
              Mock-Quittungsvorschau
            </div>
          </div>

          <FuelFillFormFields value={form} onChange={setForm} />

          <div className="flex flex-col gap-2 sm:flex-row">
            <PressableButton
              type="button"
              className="flex w-full flex-1 items-center justify-center rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] py-3.5 text-[0.92rem] font-semibold text-[color:var(--vd-text)]"
              onClick={() => window.alert("Mock: Anderen Beleg scannen")}
            >
              Anderen Beleg scannen
            </PressableButton>
            <PressableButton
              type="button"
              className="flex w-full flex-1 items-center justify-center rounded-2xl bg-neutral-950 py-3.5 text-[0.92rem] font-semibold text-white"
              onClick={() => window.alert("Mock: Tankvorgang speichern")}
            >
              Speichern
            </PressableButton>
          </div>
        </div>
      </div>
    </div>
  );
}
