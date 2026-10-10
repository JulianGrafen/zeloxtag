"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createManualVehicleEntry } from "@/actions/create-manual-entry";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { updateManualVehicleEntry } from "@/actions/update-manual-entry";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { parseMileageKmInput } from "@/lib/documents/format";
import { manualOilChangeFormFromDocument } from "@/lib/documents/manual-oil-change-form";
import {
  GarageField,
  GarageFieldCell,
  GarageFieldRow,
  GarageInsetInput,
  GarageInsetTextarea,
} from "@/components/ui/garage-field";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { Document } from "@/types/database";

interface OilChangeManualFormProps {
  tagUuid: string;
  vehicleId: string;
  onClose: () => void;
  /** When set, the form updates an existing manual Ölwechsel log. */
  editDocument?: Document | null;
}

export function OilChangeManualForm({
  tagUuid,
  vehicleId,
  onClose,
  editDocument = null,
}: OilChangeManualFormProps) {
  const router = useRouter();
  const isEditing = Boolean(editDocument);
  const [date, setDate] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [selfMade, setSelfMade] = useState(false);
  const [vendor, setVendor] = useState("");
  const [oilSpec, setOilSpec] = useState("");
  const [oilLiters, setOilLiters] = useState("");
  const [filterChanged, setFilterChanged] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editDocument) return;
    const initial = manualOilChangeFormFromDocument(editDocument);
    setDate(initial.date);
    setMileageKm(initial.mileageKm);
    setSelfMade(initial.selfMade);
    setVendor(initial.vendor);
    setOilSpec(initial.oilSpec);
    setOilLiters(initial.oilLiters);
    setFilterChanged(initial.filterChanged);
    setNotes(initial.notes);
    setError(null);
  }, [editDocument]);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("entryType", "oil_change");
      formData.set("category", "service");
      formData.set("serviceType", "oil_change");
      formData.set("title", "Ölwechsel");
      formData.set("date", date);
      formData.set("selfMade", selfMade ? "true" : "false");
      formData.set("vendor", selfMade ? "" : vendor);
      formData.set("mileageKm", mileageKm);
      formData.set("oilSpec", oilSpec);
      formData.set("oilAmountLiters", oilLiters);
      formData.set("filterChanged", filterChanged ? "true" : "false");
      formData.set("notes", notes);

      const result = isEditing && editDocument
        ? await (() => {
            formData.set("documentId", editDocument.id);
            return updateManualVehicleEntry(formData);
          })()
        : await createManualVehicleEntry(formData);

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      showSavedToast();
      onClose();
      router.refresh();
    });
  }

  return (
    <form
      className="zt-feature-panel p-4 shadow-[var(--vd-shadow-sm)]"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-[1rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
          {isEditing ? "Ölwechsel bearbeiten" : "Ölwechsel eintragen"}
        </p>
        <button
          type="button"
          aria-label="Formular schließen"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-[color:var(--vd-muted)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {error ? (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <GarageFieldRow>
          <GarageFieldCell label="Datum" htmlFor="oil-change-date">
            <GermanDateInput
              id="oil-change-date"
              variant="inset"
              value={date || null}
              onChange={(iso) => setDate(iso ?? "")}
            />
          </GarageFieldCell>
          <GarageFieldCell label="KM-Stand" htmlFor="oil-change-km">
            <MileageKmInput
              id="oil-change-km"
              variant="inset"
              value={parseMileageKmInput(mileageKm)}
              onChange={(km) => setMileageKm(km === null ? "" : String(km))}
              placeholder="z. B. 84.200"
            />
          </GarageFieldCell>
        </GarageFieldRow>

        <label className="flex items-center gap-2 text-[0.85rem] text-[color:var(--vd-text)]">
          <input
            type="checkbox"
            checked={selfMade}
            onChange={(event) => {
              setSelfMade(event.target.checked);
              if (event.target.checked) setVendor("");
            }}
            className="h-4 w-4 rounded border-[color:var(--vd-border)]"
          />
          Selbst gemacht
        </label>

        {!selfMade ? (
          <GarageField label="Werkstatt / Quelle" htmlFor="oil-change-vendor">
            <GarageInsetInput
              id="oil-change-vendor"
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              placeholder="optional"
            />
          </GarageField>
        ) : null}

        <GarageFieldRow>
          <GarageFieldCell label="Motoröl" htmlFor="oil-change-spec">
            <GarageInsetInput
              id="oil-change-spec"
              value={oilSpec}
              onChange={(event) => setOilSpec(event.target.value)}
              placeholder="z. B. 5W-30"
            />
          </GarageFieldCell>
          <GarageFieldCell label="Menge (l)" htmlFor="oil-change-liters">
            <GarageInsetInput
              id="oil-change-liters"
              inputMode="decimal"
              value={oilLiters}
              onChange={(event) => setOilLiters(event.target.value)}
              placeholder="optional"
            />
          </GarageFieldCell>
        </GarageFieldRow>

        <label className="flex items-center gap-2 text-[0.85rem] text-[color:var(--vd-text)]">
          <input
            type="checkbox"
            checked={filterChanged}
            onChange={(event) => setFilterChanged(event.target.checked)}
            className="h-4 w-4 rounded border-[color:var(--vd-border)]"
          />
          Ölfilter gewechselt
        </label>

        <GarageField label="Notiz" htmlFor="oil-change-notes">
          <GarageInsetTextarea
            id="oil-change-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="resize-none"
            placeholder="optional"
          />
        </GarageField>
      </div>

      <div className="mt-4 flex gap-2">
        <PressableButton
          type="button"
          variant="button"
          onClick={onClose}
          className="flex-1 rounded-2xl border border-[color:var(--vd-border)] px-3 py-2.5 text-[0.85rem] font-medium"
        >
          Abbrechen
        </PressableButton>
        <PressableButton
          type="submit"
          variant="button"
          disabled={pending}
          className="claim-cta flex-1 rounded-2xl px-3 py-2.5 text-[0.85rem] font-semibold disabled:opacity-60"
        >
          {pending ? "Speichern…" : isEditing ? "Aktualisieren" : "Speichern"}
        </PressableButton>
      </div>
    </form>
  );
}
