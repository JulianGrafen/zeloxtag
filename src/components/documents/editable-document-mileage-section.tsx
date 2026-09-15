"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Gauge, Pencil } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { formatMileageKmLabel } from "@/lib/documents/format";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { InvoiceDetailEditTarget } from "@/lib/documents/invoice-detail-edit";

const EDIT_TARGET: InvoiceDetailEditTarget = "mileage";

type EditableDocumentMileageSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  mileageKm: number | null;
  label?: string;
  onSaved?: (mileageKm: number | null) => void;
  hideEditTrigger?: boolean;
  editRequest?: InvoiceDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
};

export function EditableDocumentMileageSection({
  documentId,
  vehicleId,
  tagUuid,
  mileageKm,
  label = "KM",
  onSaved,
  hideEditTrigger = false,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
}: EditableDocumentMileageSectionProps) {
  const router = useRouter();
  const storedKm = mileageKm;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | null>(storedKm);
  const [displayKm, setDisplayKm] = useState(storedKm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayKm(storedKm);
      setDraft(storedKm);
    }
  }, [storedKm, editing]);

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0) return;
    setError(null);
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, onEditRequestConsumed]);

  function handleCancel() {
    setDraft(storedKm);
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
        mileageKm: draft,
      });
      if (isActionFailure(result)) {
        setError(result.message);
        return;
      }
      setDisplayKm(draft);
      onSaved?.(draft);
      setEditing(false);
      router.refresh();
    });
  }

  const displayLabel =
    displayKm !== null ? formatMileageKmLabel(displayKm) : "—";

  return (
    <div id={sectionId} className="scroll-mt-24">
      <div className="mb-1 flex items-center justify-between gap-2">
        <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
          {label}
        </dt>
        {!editing && !hideEditTrigger ? (
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
        <dd className="mt-0.5 flex items-center gap-1.5 font-medium tabular-nums text-[color:var(--vd-text)]">
          <Gauge className="h-3.5 w-3.5 text-[color:var(--vd-muted)]" aria-hidden />
          {displayLabel}
        </dd>
      ) : (
        <div className="mt-1 space-y-2">
          <MileageKmInput
            value={draft}
            onChange={setDraft}
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
