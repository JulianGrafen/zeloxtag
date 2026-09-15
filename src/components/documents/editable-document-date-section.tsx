"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Calendar, Pencil } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { formatCompactGermanDate } from "@/lib/documents/format";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

type EditableDocumentDateSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  date: string | null;
  label?: string;
  onSaved?: (date: string | null) => void;
};

export function EditableDocumentDateSection({
  documentId,
  vehicleId,
  tagUuid,
  date,
  label = "Datum",
  onSaved,
}: EditableDocumentDateSectionProps) {
  const router = useRouter();
  const storedDate = date?.trim() || null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(storedDate);
  const [displayDate, setDisplayDate] = useState(storedDate);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayDate(storedDate);
      setDraft(storedDate);
    }
  }, [storedDate, editing]);

  function handleCancel() {
    setDraft(storedDate);
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateDocumentFields({
        documentId,
        vehicleId,
        tagUuid,
        date: draft,
      });
      if (isActionFailure(result)) {
        setError(result.message);
        return;
      }
      setDisplayDate(draft);
      onSaved?.(draft);
      setEditing(false);
      router.refresh();
    });
  }

  const displayLabel = displayDate
    ? formatCompactGermanDate(displayDate) || displayDate
    : "—";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
          {label}
        </dt>
        {!editing ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--vd-text)]"
          >
            <Pencil className="h-2.5 w-2.5" aria-hidden />
            Bearbeiten
          </PressableButton>
        ) : null}
      </div>

      {!editing ? (
        <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-[color:var(--vd-text)]">
          <Calendar className="h-3.5 w-3.5 text-[color:var(--vd-muted)]" aria-hidden />
          {displayLabel}
        </dd>
      ) : (
        <div className="mt-1 space-y-2">
          <GermanDateInput
            value={draft}
            onChange={(iso) => setDraft(iso)}
            className="claim-input w-full min-w-0"
          />
          <div className="flex flex-wrap gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-3 py-1.5 text-[0.75rem] font-semibold text-white"
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-lg border border-[color:var(--vd-border)] px-3 py-1.5 text-[0.75rem] font-medium text-[color:var(--vd-text)]"
            >
              Abbrechen
            </PressableButton>
          </div>
          {error ? (
            <p role="alert" className="text-[0.75rem] text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
