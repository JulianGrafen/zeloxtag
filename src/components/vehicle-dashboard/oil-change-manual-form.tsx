"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createManualVehicleEntry } from "@/actions/create-manual-entry";
import { updateManualVehicleEntry } from "@/actions/update-manual-entry";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { parseMileageKmInput } from "@/lib/documents/format";
import { manualOilChangeFormFromDocument } from "@/lib/documents/manual-oil-change-form";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { Document } from "@/types/database";

interface OilChangeManualFormProps {
  tagUuid: string;
  vehicleId: string;
  onClose: () => void;
  /** When set, the form updates an existing manual Ölwechsel log. */
  editDocument?: Document | null;
}

const fieldLabelClassName =
  "text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]";

function TwoColFieldRow({
  leftLabel,
  rightLabel,
  left,
  right,
}: {
  leftLabel: string;
  rightLabel: string;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      <span className={fieldLabelClassName}>{leftLabel}</span>
      <span className={fieldLabelClassName}>{rightLabel}</span>
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
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

      onClose();
      router.refresh();
    });
  }

  return (
    <form
      className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
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
        <TwoColFieldRow
          leftLabel="Datum"
          rightLabel="KM-Stand"
          left={
            <GermanDateInput
              value={date || null}
              onChange={(iso) => setDate(iso ?? "")}
              className="claim-input w-full min-w-0"
            />
          }
          right={
            <MileageKmInput
              value={parseMileageKmInput(mileageKm)}
              onChange={(km) => setMileageKm(km === null ? "" : String(km))}
              className="claim-input w-full"
              placeholder="z. B. 84.200"
            />
          }
        />

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
          <label className="block space-y-1.5">
            <span className={fieldLabelClassName}>Werkstatt / Quelle</span>
            <input
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              className="claim-input w-full"
              placeholder="optional"
            />
          </label>
        ) : null}

        <TwoColFieldRow
          leftLabel="Motoröl"
          rightLabel="Menge (l)"
          left={
            <input
              value={oilSpec}
              onChange={(event) => setOilSpec(event.target.value)}
              className="claim-input w-full"
              placeholder="z. B. 5W-30"
            />
          }
          right={
            <input
              inputMode="decimal"
              value={oilLiters}
              onChange={(event) => setOilLiters(event.target.value)}
              className="claim-input w-full"
              placeholder="optional"
            />
          }
        />

        <label className="flex items-center gap-2 text-[0.85rem] text-[color:var(--vd-text)]">
          <input
            type="checkbox"
            checked={filterChanged}
            onChange={(event) => setFilterChanged(event.target.checked)}
            className="h-4 w-4 rounded border-[color:var(--vd-border)]"
          />
          Ölfilter gewechselt
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabelClassName}>Notiz</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="claim-input w-full resize-none"
            placeholder="optional"
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <PressableButton
          type="button"
          variant="button"
          disabled={pending}
          onClick={onClose}
          className="claim-back flex-1"
        >
          Abbrechen
        </PressableButton>
        <PressableButton
          type="submit"
          variant="button"
          disabled={pending}
          className="claim-cta flex-1 disabled:opacity-60"
        >
          {pending ? "Speichern…" : isEditing ? "Übernehmen" : "Speichern"}
        </PressableButton>
      </div>
    </form>
  );
}
