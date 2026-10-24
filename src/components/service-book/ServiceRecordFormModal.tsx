"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { createServiceRecord } from "@/actions/service-records";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import {
  GarageField,
  GarageFieldCell,
  GarageFieldRow,
  GarageInsetInput,
  GarageInsetTextarea,
} from "@/components/ui/garage-field";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  QUICK_CHIP_CATEGORIES,
  serviceCategoryPreset,
} from "@/lib/service/category-presets";
import type { ServiceRecordCategory } from "@/lib/service/service-record";
import { showSavedToast } from "@/lib/ui/saved-toast";

interface ServiceRecordFormModalProps {
  vehicleId: string;
  tagUuid: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ServiceRecordFormModal({
  vehicleId,
  tagUuid,
  onClose,
  onSaved,
}: ServiceRecordFormModalProps) {
  const [category, setCategory] = useState<ServiceRecordCategory>("oil_change");
  const [title, setTitle] = useState(serviceCategoryPreset("oil_change").defaultTitle);
  const [date, setDate] = useState<string | null>(null);
  const [mileageKm, setMileageKm] = useState<number | null>(null);
  const [performedBy, setPerformedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [showOnShowcase, setShowOnShowcase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectCategory(next: ServiceRecordCategory) {
    setCategory(next);
    setTitle(serviceCategoryPreset(next).defaultTitle);
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicleId", vehicleId);
      formData.set("tagUuid", tagUuid);
      formData.set("category", category);
      formData.set("title", title);
      formData.set("date", date ?? "");
      formData.set("mileageKm", mileageKm != null ? String(mileageKm) : "");
      formData.set("performedBy", performedBy);
      formData.set("notes", notes);
      formData.set(
        "showOnPublicShowcase",
        showOnShowcase ? "true" : "false",
      );
      formData.set(
        "useDocumentDualWrite",
        category === "oil_change" ? "true" : "false",
      );

      const result = await createServiceRecord(formData);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      showSavedToast();
      onSaved();
      onClose();
    });
  }

  return (
    <div className="zt-feature-panel space-y-4 p-5 shadow-[var(--vd-shadow-sm)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-[1.1rem] font-semibold text-[color:var(--vd-text)]">
          Wartung eintragen
        </h2>
        <PressableButton type="button" variant="button" onClick={onClose}>
          <X className="h-4 w-4" aria-hidden />
        </PressableButton>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_CHIP_CATEGORIES.map((chip) => (
          <PressableButton
            key={chip}
            type="button"
            variant="button"
            onClick={() => selectCategory(chip)}
            className={`rounded-full px-3 py-1.5 text-[0.78rem] font-medium ${
              category === chip
                ? "bg-[color:var(--vd-accent)] text-white"
                : "bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-muted)]"
            }`}
          >
            {serviceCategoryPreset(chip).label}
          </PressableButton>
        ))}
      </div>

      <GarageField label="Titel">
        <GarageInsetInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </GarageField>

      <GarageFieldRow>
        <GarageFieldCell>
          <GarageField label="Datum">
            <GermanDateInput value={date} onChange={setDate} variant="inset" />
          </GarageField>
        </GarageFieldCell>
        <GarageFieldCell>
          <GarageField label="Kilometerstand">
            <MileageKmInput value={mileageKm} onChange={setMileageKm} variant="inset" />
          </GarageField>
        </GarageFieldCell>
      </GarageFieldRow>

      <GarageField label="Werkstatt / DIY">
        <GarageInsetInput
          value={performedBy}
          onChange={(e) => setPerformedBy(e.target.value)}
          placeholder="z. B. Werkstatt oder Eigenregie"
        />
      </GarageField>

      <GarageField label="Notizen">
        <GarageInsetTextarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </GarageField>

      <label className="flex items-center gap-2 text-[0.85rem] text-[color:var(--vd-text)]">
        <input
          type="checkbox"
          checked={showOnShowcase}
          onChange={(e) => setShowOnShowcase(e.target.checked)}
          className="h-4 w-4 rounded border-[color:var(--vd-border)]"
        />
        Auf Showcase-Profil öffentlich anzeigen
      </label>

      {error ? (
        <p className="text-[0.85rem] text-red-500" role="alert">{error}</p>
      ) : null}

      <PressableButton
        type="button"
        variant="button"
        disabled={pending || !date}
        onClick={handleSubmit}
        className="w-full rounded-xl bg-[color:var(--vd-accent)] py-3 text-[0.9rem] font-semibold text-white"
      >
        {pending ? "Speichern…" : "Speichern"}
      </PressableButton>
    </div>
  );
}
