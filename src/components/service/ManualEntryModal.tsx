"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen, X } from "lucide-react";

import { createManualVehicleEntry } from "@/actions/create-manual-entry";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { parseMileageKmInput } from "@/lib/documents/format";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  MANUAL_SERVICE_ENTRY_LABELS,
  MANUAL_SERVICE_ENTRY_TYPES,
  type ManualServiceEntryType,
} from "@/lib/documents/manual-entries";

interface ManualEntryModalProps {
  tagUuid: string;
  vehicleId: string;
  open: boolean;
  onClose: () => void;
  /** Prefill category when opened from Öl-Wechsel tile. */
  initialServiceType?: ManualServiceEntryType;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(raw: string): string {
  return raw.replace(/\s/g, "").replace(/€|eur/gi, "");
}

export function ManualEntryModal({
  tagUuid,
  vehicleId,
  open,
  onClose,
  initialServiceType = "service",
}: ManualEntryModalProps) {
  const router = useRouter();
  const [serviceType, setServiceType] =
    useState<ManualServiceEntryType>(initialServiceType);
  const [date, setDate] = useState(todayIsoDate);
  const [mileageKm, setMileageKm] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setServiceType(initialServiceType);
    setDate(todayIsoDate());
    setError(null);
    setSuccess(null);
  }, [open, initialServiceType]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pending]);

  if (!open) return null;

  function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!mileageKm.trim()) {
      setError("Bitte den Kilometerstand eintragen.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("serviceType", serviceType);
      formData.set("category", serviceType === "tuning_part" ? "tuning" : "service");
      formData.set(
        "title",
        MANUAL_SERVICE_ENTRY_LABELS[serviceType],
      );
      formData.set("date", date || todayIsoDate());
      formData.set("mileageKm", mileageKm);
      formData.set("amount", parseAmount(amount));
      formData.set("details", details);
      formData.set("vendor", vendor);
      formData.set("notes", notes);
      if (serviceType === "oil_change") {
        formData.set("entryType", "oil_change");
      }

      const result = await createManualVehicleEntry(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setSuccess("Eintrag gespeichert.");
      router.refresh();
      window.setTimeout(() => {
        onClose();
      }, 600);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      style={{ background: "var(--vd-overlay)" }}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-entry-title"
        className="relative z-10 w-full max-w-lg rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow)]"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="vd-icon-badge inline-flex h-9 w-9 items-center justify-center rounded-full">
              <NotebookPen className="h-4 w-4" aria-hidden />
            </span>
            <p
              id="manual-entry-title"
              className="font-[family-name:var(--font-display)] text-[1rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]"
            >
              Manuell eintragen
            </p>
          </div>
          <button
            type="button"
            aria-label="Dialog schließen"
            disabled={pending}
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-[color:var(--vd-muted)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="mb-4 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
          Service, Ölwechsel oder Wartung ohne KI-Scan festhalten — kostenlos
          für alle Nutzer.
        </p>

        {error ? (
          <p
            role="alert"
            className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-[0.8rem] text-red-700"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-[0.8rem] text-emerald-800">
            {success}
          </p>
        ) : null}

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Typ
            </span>
            <select
              value={serviceType}
              onChange={(event) =>
                setServiceType(event.target.value as ManualServiceEntryType)
              }
              className="claim-input w-full"
            >
              {MANUAL_SERVICE_ENTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MANUAL_SERVICE_ENTRY_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

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
                Kilometerstand
              </span>
              <MileageKmInput
                value={parseMileageKmInput(mileageKm)}
                onChange={(km) => setMileageKm(km === null ? "" : String(km))}
                className="claim-input w-full"
                placeholder="z. B. 84.200"
                required
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Kosten (€)
            </span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="claim-input w-full"
              placeholder="optional"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Details / Spezifikation
            </span>
            <input
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="claim-input w-full"
              placeholder={
                serviceType === "oil_change"
                  ? "z. B. 5W-30 Shell Helix, Filter gewechselt"
                  : "z. B. Bremsbeläge vorne, Inspektion"
              }
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Werkstatt
            </span>
            <input
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              className="claim-input w-full"
              placeholder="optional"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Notizen
            </span>
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
            type="button"
            variant="button"
            disabled={pending}
            onClick={handleSubmit}
            className="claim-cta flex-1 disabled:opacity-60"
          >
            {pending ? "Speichern…" : "Speichern"}
          </PressableButton>
        </div>
      </div>
    </div>
  );
}
