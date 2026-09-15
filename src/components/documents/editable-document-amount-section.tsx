"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { GermanAmountInput } from "@/components/documents/german-amount-input";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { DocumentDetailHeroAmount } from "@/components/documents/document-detail-hero";
import type { InvoiceDetailEditTarget } from "@/lib/documents/invoice-detail-edit";

const EDIT_TARGET: InvoiceDetailEditTarget = "amount";

type EditableDocumentAmountSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  amount: number | null;
  onSaved?: (amount: number | null) => void;
  hideEditTrigger?: boolean;
  editRequest?: InvoiceDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
};

export function EditableDocumentAmountSection({
  documentId,
  vehicleId,
  tagUuid,
  amount,
  onSaved,
  hideEditTrigger = false,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
}: EditableDocumentAmountSectionProps) {
  const router = useRouter();
  const storedAmount = amount;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | null>(storedAmount);
  const [displayAmount, setDisplayAmount] = useState(storedAmount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayAmount(storedAmount);
      setDraft(storedAmount);
    }
  }, [storedAmount, editing]);

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0) return;
    setError(null);
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, onEditRequestConsumed]);

  function handleCancel() {
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
        amount: draft,
      });
      if (isActionFailure(result)) {
        setError(result.message);
        return;
      }
      setDisplayAmount(draft);
      onSaved?.(draft);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div id={sectionId} className="scroll-mt-24">
      {!editing ? (
        <div className="flex items-start justify-end gap-2">
          {displayAmount !== null ? (
            <DocumentDetailHeroAmount>
              {formatEur(displayAmount)}
            </DocumentDetailHeroAmount>
          ) : (
            <span className="text-[1.05rem] font-semibold tabular-nums text-[color:var(--vd-muted)]">
              —
            </span>
          )}
          {!hideEditTrigger ? (
            <PressableButton
              type="button"
              variant="button"
              onClick={() => setEditing(true)}
              aria-label="Gesamtbetrag bearbeiten"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </PressableButton>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-3">
          <GermanAmountInput
            value={draft}
            onChange={setDraft}
            className="claim-input w-full min-w-0"
            placeholder="189,50"
          />
          <div className="flex flex-wrap gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-3.5 py-2 text-[0.8rem] font-semibold text-white"
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--vd-border)] px-3.5 py-2 text-[0.8rem] font-medium text-[color:var(--vd-text)]"
            >
              Abbrechen
            </PressableButton>
          </div>
          {error ? (
            <p role="alert" className="text-[0.78rem] text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
