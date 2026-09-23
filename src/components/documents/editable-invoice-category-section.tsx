"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Pencil, Tag } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { InvoiceCategoryChips } from "@/components/documents/invoice-category-chips";
import {
  displayInvoiceReviewCategoryLabel,
  normalizeInvoiceReviewCategory,
  type InvoiceReviewCategory,
} from "@/lib/documents/invoice-review-categories";
import type { InvoiceTextParseCategory } from "@/lib/ocr/text-parse-schema";
import type { InvoiceDetailEditTarget } from "@/lib/documents/invoice-detail-edit";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

const EDIT_TARGET: InvoiceDetailEditTarget = "category";

type EditableInvoiceCategorySectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  category: string | null;
  onSaved?: (category: string) => void;
  hideEditTrigger?: boolean;
  editRequest?: InvoiceDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
};

export function EditableInvoiceCategorySection({
  documentId,
  vehicleId,
  tagUuid,
  category,
  onSaved,
  hideEditTrigger = false,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
}: EditableInvoiceCategorySectionProps) {
  const router = useRouter();
  const storedCategory = category?.trim() || null;
  const parseCategory = (value: string | null): InvoiceReviewCategory =>
    normalizeInvoiceReviewCategory(
      value as InvoiceTextParseCategory | null | undefined,
      "service",
    );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<InvoiceReviewCategory>(
    parseCategory(storedCategory),
  );
  const [displayCategory, setDisplayCategory] = useState(storedCategory);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayCategory(storedCategory);
      setDraft(parseCategory(storedCategory));
    }
  }, [storedCategory, editing]);

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0) return;
    setError(null);
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, onEditRequestConsumed]);

  function handleCancel() {
    setDraft(parseCategory(storedCategory));
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
        category: draft,
      });
      if (isActionFailure(result)) {
        setError(result.message);
        return;
      }
      setDisplayCategory(draft);
      onSaved?.(draft);
      setEditing(false);
      router.refresh();
    });
  }

  const displayLabel = displayInvoiceReviewCategoryLabel(displayCategory);

  return (
    <div
      id={sectionId}
      className="scroll-mt-24 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
          Kategorie
        </p>
        {!editing && !hideEditTrigger ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-2.5 py-1 text-[0.72rem] font-medium text-[color:var(--vd-text)]"
          >
            <Pencil className="h-3 w-3" aria-hidden />
            Bearbeiten
          </PressableButton>
        ) : null}
      </div>

      {!editing ? (
        <div className="flex items-start gap-2.5">
          <Tag
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
            aria-hidden
          />
          <p className="text-[0.92rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
            {displayLabel}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <InvoiceCategoryChips
            value={draft}
            onChange={setDraft}
            disabled={pending}
          />
          <div className="flex flex-wrap gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleSave}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-neutral-900 px-3 py-2.5 text-[0.85rem] font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleCancel}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-[color:var(--vd-border)] px-3 py-2.5 text-[0.85rem] font-medium text-[color:var(--vd-text)]"
            >
              Abbrechen
            </PressableButton>
          </div>
          {error ? (
            <p role="alert" className="text-[0.8rem] text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
