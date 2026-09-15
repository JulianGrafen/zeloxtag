"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { NotebookPen, Pencil } from "lucide-react";

import { updateManualOilChangeFields } from "@/actions/update-manual-oil-change-fields";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { OilDetailEditTarget } from "@/lib/documents/oil-detail-edit";

const EDIT_TARGET: OilDetailEditTarget = "notes";

type EditableOilChangeNotesSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  notes: string;
  onSaved?: (notes: string) => void;
  hideEditTrigger?: boolean;
  editRequest?: OilDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
};

export function EditableOilChangeNotesSection({
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
}: EditableOilChangeNotesSectionProps) {
  const router = useRouter();
  const storedNotes = notes.trim();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(storedNotes);
  const [displayNotes, setDisplayNotes] = useState(storedNotes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayNotes(storedNotes);
      setDraft(storedNotes);
    }
  }, [storedNotes, editing]);

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0) return;
    setError(null);
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, onEditRequestConsumed]);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateManualOilChangeFields({
        documentId,
        vehicleId,
        tagUuid,
        patch: { notes: draft.trim() },
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      const next = draft.trim();
      setDisplayNotes(next);
      onSaved?.(next);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section
      id={sectionId}
      className="scroll-mt-24 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[color:var(--vd-muted)]">
          <NotebookPen className="h-3.5 w-3.5" aria-hidden />
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
            Notiz
          </h2>
        </div>
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
        <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-text)]">
          {displayNotes || "—"}
        </p>
      ) : (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={500}
            className="claim-input w-full min-w-0 resize-y rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2.5 text-[0.88rem]"
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
              onClick={() => setEditing(false)}
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--vd-border)] px-3.5 py-2 text-[0.8rem] font-medium"
            >
              Abbrechen
            </PressableButton>
          </div>
          {error ? (
            <p role="alert" className="text-[0.78rem] text-red-700">{error}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
