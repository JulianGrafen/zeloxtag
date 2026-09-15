"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { NotebookPen, Pencil } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { InvoiceDetailEditTarget } from "@/lib/documents/invoice-detail-edit";

const EDIT_TARGET: InvoiceDetailEditTarget = "notes";

type EditableDocumentNotesSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  notes: string | null;
  onSaved?: (notes: string | null) => void;
  hideEditTrigger?: boolean;
  editRequest?: InvoiceDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
};

export function EditableDocumentNotesSection({
  documentId,
  vehicleId,
  tagUuid,
  notes,
  onSaved,
  hideEditTrigger = false,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
}: EditableDocumentNotesSectionProps) {
  const router = useRouter();
  const storedNotes = notes?.trim() || null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(storedNotes ?? "");
  const [displayNotes, setDisplayNotes] = useState(storedNotes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayNotes(storedNotes);
      setDraft(storedNotes ?? "");
    }
  }, [storedNotes, editing]);

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0) return;
    setError(null);
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, onEditRequestConsumed]);

  function handleCancel() {
    setDraft(storedNotes ?? "");
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    const nextNotes = draft.trim() || null;
    startTransition(async () => {
      const result = await updateDocumentFields({
        documentId,
        vehicleId,
        tagUuid,
        notes: nextNotes,
      });
      if (isActionFailure(result)) {
        setError(result.message);
        return;
      }
      setDisplayNotes(nextNotes);
      onSaved?.(nextNotes);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section
      id={sectionId}
      className="scroll-mt-24 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Notizen
        </h2>
        {!editing && !hideEditTrigger ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-1.5 text-[0.72rem] font-medium text-[color:var(--vd-text)]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Bearbeiten
          </PressableButton>
        ) : null}
      </div>

      {!editing ? (
        <div className="flex items-start gap-2.5">
          <NotebookPen
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
            aria-hidden
          />
          <p className="whitespace-pre-line text-[0.9rem] text-[color:var(--vd-text)]">
            {displayNotes ?? "—"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="z. B. Filter mitgewechselt, nächster Service in 15.000 km"
            className="claim-input w-full min-w-0 resize-y rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2.5 text-[0.88rem] text-[color:var(--vd-text)]"
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
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[0.78rem] text-red-700"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
