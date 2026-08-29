"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { updateTuevApprovalFields } from "@/actions/update-tuev-approval-fields";
import { TuevDefectsSection } from "@/components/documents/tuev-defects-section";
import {
  draftRowsToReportDefects,
  emptyDraftRow,
  parseDraftRows,
  toDraftRows,
  TuevDefectsDraftEditor,
  type DraftDefect,
} from "@/components/documents/tuev-defects-draft-editor";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import type { TuevReport } from "@/lib/validations/documentSchemas";

type EditableTuevDefectsSectionProps = {
  approvalFields: Extract<ApprovalFields, { kind: "tuev" }>;
  documentId: string;
  vehicleId: string;
  tagUuid: string;
};

/**
 * Owner-editable festgestellte Mängel on saved TÜV documents.
 */
export function EditableTuevDefectsSection({
  approvalFields,
  documentId,
  vehicleId,
  tagUuid,
}: EditableTuevDefectsSectionProps) {
  const storedData = approvalFields.data;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftDefect[]>(() => toDraftRows(storedData));
  const [displayData, setDisplayData] = useState<
    Pick<TuevReport, "defectsTable" | "defectsList">
  >({
    defectsTable: storedData.defectsTable,
    defectsList: storedData.defectsList,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayData({
        defectsTable: storedData.defectsTable,
        defectsList: storedData.defectsList,
      });
    }
  }, [storedData.defectsTable, storedData.defectsList, editing]);

  function startEdit() {
    setError(null);
    setDraft(toDraftRows(displayData));
    setEditing(true);
  }

  function cancelEdit() {
    setError(null);
    setDraft(toDraftRows(displayData));
    setEditing(false);
  }

  function handleSave() {
    const nextRows = parseDraftRows(draft);
    setError(null);

    startTransition(async () => {
      const result = await updateTuevApprovalFields({
        documentId,
        vehicleId,
        tagUuid,
        defectsTable: nextRows.length > 0 ? nextRows : null,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setDisplayData(draftRowsToReportDefects(draft));
      setEditing(false);
    });
  }

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Festgestellte Mängel
        </h2>
        {!editing ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-1.5 text-[0.75rem] font-medium text-[color:var(--vd-text)]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Bearbeiten
          </PressableButton>
        ) : null}
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={startEdit}
          className="group w-full rounded-xl border border-transparent text-left transition-colors hover:border-[color:var(--vd-border)] hover:bg-[color:var(--vd-surface-elevated)]/40 active:bg-[color:var(--vd-surface-elevated)]"
        >
          <div className="p-1">
            <TuevDefectsSection data={displayData} asSection={false} />
            <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] font-medium text-[color:var(--vd-muted)] group-hover:text-[color:var(--vd-text)]">
              <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Tippen zum Bearbeiten
            </p>
          </div>
        </button>
      ) : (
        <>
          <TuevDefectsDraftEditor
            draft={draft}
            onChange={setDraft}
            disabled={pending}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-[0.82rem] font-semibold text-white"
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={cancelEdit}
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--vd-border)] px-4 py-2.5 text-[0.82rem] font-medium text-[color:var(--vd-text)]"
            >
              Abbrechen
            </PressableButton>
          </div>
        </>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
