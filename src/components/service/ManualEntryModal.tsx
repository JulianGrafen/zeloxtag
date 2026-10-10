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
import {
  GarageField,
  GarageFieldCell,
  GarageFieldRow,
  GarageInsetInput,
  GarageInsetSelect,
  GarageInsetTextarea,
} from "@/components/ui/garage-field";
import { showSavedToast } from "@/lib/ui/saved-toast";

interface ManualEntryModalProps {
  tagUuid: string;
  vehicleId: string;
  open: boolean;
  onClose: () => void;
  /** Prefill category when opened from Öl-Wechsel tile. */
  initialServiceType?: ManualServiceEntryType;
  /** Schrauber copy — emphasize receipt photo. */
  isContributor?: boolean;
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
  isContributor = false,
}: ManualEntryModalProps) {
  const router = useRouter();
  const [serviceType, setServiceType] =
    useState<ManualServiceEntryType>(initialServiceType);
  const [date, setDate] = useState(todayIsoDate);
  const [mileageKm, setMileageKm] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [selfMade, setSelfMade] = useState(false);
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptPhoto, setReceiptPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setServiceType(initialServiceType);
    setDate(todayIsoDate());
    setReceiptPhoto(null);
    setSelfMade(false);
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

  useEffect(() => {
    if (serviceType !== "oil_change") {
      setSelfMade(false);
    }
  }, [serviceType]);

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
      formData.set("vendor", selfMade ? "" : vendor);
      formData.set("notes", notes);
      if (serviceType === "oil_change") {
        formData.set("entryType", "oil_change");
        formData.set("selfMade", selfMade ? "true" : "false");
      }
      if (receiptPhoto) {
        formData.set(
          "photo",
          receiptPhoto,
          receiptPhoto.name?.trim() || "beleg.jpg",
        );
      }

      const result = await createManualVehicleEntry(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }

      showSavedToast();
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
        className="relative z-10 w-full max-w-lg zt-feature-panel p-4 shadow-[var(--vd-shadow)]"
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
          {isContributor
            ? "Service oder Reparatur eintragen — optional mit Foto des Belegs. Kostenlos, ohne KI-Scan."
            : "Service, Ölwechsel oder Wartung ohne KI-Scan festhalten — kostenlos für alle Nutzer."}
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
          <GarageField label="Typ" htmlFor="manual-entry-modal-type">
            <GarageInsetSelect
              id="manual-entry-modal-type"
              value={serviceType}
              onChange={(event) =>
                setServiceType(event.target.value as ManualServiceEntryType)
              }
              className="w-full"
            >
              {MANUAL_SERVICE_ENTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {MANUAL_SERVICE_ENTRY_LABELS[type]}
                </option>
              ))}
            </GarageInsetSelect>
          </GarageField>

          <GarageFieldRow>
            <GarageFieldCell label="Datum" htmlFor="manual-entry-modal-date">
              <GermanDateInput
                id="manual-entry-modal-date"
                variant="inset"
                value={date || null}
                onChange={(iso) => setDate(iso ?? "")}
              />
            </GarageFieldCell>
            <GarageFieldCell label="Kilometerstand" htmlFor="manual-entry-modal-km">
              <MileageKmInput
                id="manual-entry-modal-km"
                variant="inset"
                value={parseMileageKmInput(mileageKm)}
                onChange={(km) => setMileageKm(km === null ? "" : String(km))}
                placeholder="z. B. 84.200"
                required
              />
            </GarageFieldCell>
          </GarageFieldRow>

          <GarageField label="Kosten (€)" htmlFor="manual-entry-modal-amount">
            <GarageInsetInput
              id="manual-entry-modal-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="optional"
              className="w-full tabular-nums"
            />
          </GarageField>

          <GarageField
            label="Details / Spezifikation"
            htmlFor="manual-entry-modal-details"
          >
            <GarageInsetInput
              id="manual-entry-modal-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="w-full"
              placeholder={
                serviceType === "oil_change"
                  ? "z. B. 5W-30 Shell Helix, Filter gewechselt"
                  : "z. B. Bremsbeläge vorne, Inspektion"
              }
            />
          </GarageField>

          {serviceType === "oil_change" ? (
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
          ) : null}

          {serviceType !== "oil_change" || !selfMade ? (
            <GarageField
              label={
                serviceType === "oil_change" ? "Werkstatt / Quelle" : "Werkstatt"
              }
              htmlFor="manual-entry-modal-vendor"
            >
              <GarageInsetInput
                id="manual-entry-modal-vendor"
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
                className="w-full"
                placeholder="optional"
              />
            </GarageField>
          ) : null}

          <GarageField label="Beleg-Foto" htmlFor="manual-entry-modal-receipt">
            <GarageInsetInput
              id="manual-entry-modal-receipt"
              type="file"
              accept="image/*,application/pdf"
              className="w-full text-[0.82rem]"
              onChange={(event) => {
                setReceiptPhoto(event.target.files?.[0] ?? null);
              }}
            />
            <span className="mt-1 block text-[0.75rem] text-[color:var(--vd-muted)]">
              Optional — Foto oder PDF des Werkstattbelegs
            </span>
          </GarageField>

          <GarageField label="Notizen" htmlFor="manual-entry-modal-notes">
            <GarageInsetTextarea
              id="manual-entry-modal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="min-h-[3.5rem] resize-none"
              placeholder="optional"
            />
          </GarageField>
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
