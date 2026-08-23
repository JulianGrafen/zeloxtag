"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createManualVehicleEntry } from "@/actions/create-manual-entry";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { parseMileageKmInput } from "@/lib/documents/format";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

interface OilChangeManualFormProps {
  tagUuid: string;
  vehicleId: string;
  onClose: () => void;
}

export function OilChangeManualForm({
  tagUuid,
  vehicleId,
  onClose,
}: OilChangeManualFormProps) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [vendor, setVendor] = useState("");
  const [oilSpec, setOilSpec] = useState("");
  const [oilLiters, setOilLiters] = useState("");
  const [filterChanged, setFilterChanged] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("entryType", "oil_change");
      formData.set("title", "Ölwechsel");
      formData.set("date", date);
      formData.set("vendor", vendor);
      formData.set("mileageKm", mileageKm);
      formData.set("oilSpec", oilSpec);
      formData.set("oilAmountLiters", oilLiters);
      formData.set("filterChanged", filterChanged ? "true" : "false");
      formData.set("notes", notes);

      const result = await createManualVehicleEntry(formData);
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
          Ölwechsel eintragen
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

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Datum
          </span>
          <GermanDateInput
            value={date || null}
            onChange={(iso) => setDate(iso ?? "")}
            className="claim-input w-full"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            KM-Stand
          </span>
          <MileageKmInput
            value={parseMileageKmInput(mileageKm)}
            onChange={(km) => setMileageKm(km === null ? "" : String(km))}
            className="claim-input w-full"
            placeholder="z. B. 84.200"
          />
        </label>
      </div>

      <label className="mt-3 block space-y-1.5">
        <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
          Werkstatt / Quelle
        </span>
        <input
          value={vendor}
          onChange={(event) => setVendor(event.target.value)}
          className="claim-input w-full"
          placeholder="optional"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Motoröl
          </span>
          <input
            value={oilSpec}
            onChange={(event) => setOilSpec(event.target.value)}
            className="claim-input w-full"
            placeholder="z. B. 5W-30"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
            Menge (l)
          </span>
          <input
            inputMode="decimal"
            value={oilLiters}
            onChange={(event) => setOilLiters(event.target.value)}
            className="claim-input w-full"
            placeholder="optional"
          />
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-[0.85rem] text-[color:var(--vd-text)]">
        <input
          type="checkbox"
          checked={filterChanged}
          onChange={(event) => setFilterChanged(event.target.checked)}
          className="h-4 w-4 rounded border-[color:var(--vd-border)]"
        />
        Ölfilter gewechselt
      </label>

      <label className="mt-3 block space-y-1.5">
        <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
          Notiz
        </span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          className="claim-input w-full resize-none"
          placeholder="optional"
        />
      </label>

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
          {pending ? "Speichern…" : "Speichern"}
        </PressableButton>
      </div>
    </form>
  );
}
