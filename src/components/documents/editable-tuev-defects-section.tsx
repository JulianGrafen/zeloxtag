"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { updateTuevApprovalFields } from "@/actions/update-tuev-approval-fields";
import { TuevDefectsSection } from "@/components/documents/tuev-defects-section";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { ApprovalFields } from "@/lib/documents/approval-fields";
import { parseTuevDefectLine } from "@/lib/ocr/tuev-defects-from-text";
import type { TuevDefectRow, TuevReport } from "@/lib/validations/documentSchemas";

type EditableTuevDefectsSectionProps = {
  approvalFields: Extract<ApprovalFields, { kind: "tuev" }>;
  documentId: string;
  vehicleId: string;
  tagUuid: string;
};

type DraftDefect = {
  key: string;
  checkpoint: string;
  description: string;
  severity: "" | "EM" | "GM";
};

function emptyDraftRow(): DraftDefect {
  return {
    key: crypto.randomUUID(),
    checkpoint: "",
    description: "",
    severity: "",
  };
}

function toDraftRows(data: Pick<TuevReport, "defectsTable" | "defectsList">): DraftDefect[] {
  if (data.defectsTable?.length) {
    return data.defectsTable.map((row) => ({
      key: crypto.randomUUID(),
      checkpoint: row.checkpoint ?? "",
      description: row.description,
      severity: row.severity ?? "",
    }));
  }

  if (data.defectsList?.length) {
    return data.defectsList.map((line) => {
      const parsed = parseTuevDefectLine(line);
      if (parsed) {
        return {
          key: crypto.randomUUID(),
          checkpoint: parsed.checkpoint ?? "",
          description: parsed.description,
          severity: parsed.severity ?? "",
        };
      }
      return {
        key: crypto.randomUUID(),
        checkpoint: "",
        description: line,
        severity: "",
      };
    });
  }

  return [emptyDraftRow()];
}

function parseDraftRows(draft: DraftDefect[]): TuevDefectRow[] {
  const rows: TuevDefectRow[] = [];

  for (const row of draft) {
    const description = row.description.trim().slice(0, 500);
    if (!description) continue;

    const checkpoint = row.checkpoint.trim().slice(0, 24) || null;
    rows.push({
      checkpoint,
      description,
      severity: row.severity === "EM" || row.severity === "GM" ? row.severity : null,
    });

    if (rows.length >= 80) break;
  }

  return rows;
}

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

      setDisplayData({
        defectsTable: nextRows.length > 0 ? nextRows : null,
        defectsList: null,
      });
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
        <TuevDefectsSection data={displayData} asSection={false} />
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2">
            {draft.map((row, index) => (
              <li
                key={row.key}
                className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[6.5rem_5.5rem_1fr_auto] sm:items-start">
                  <label className="block min-w-0">
                    <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
                      Prüfpunkt
                    </span>
                    <input
                      value={row.checkpoint}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((current) =>
                          current.map((entry, i) =>
                            i === index ? { ...entry, checkpoint: value } : entry,
                          ),
                        );
                      }}
                      placeholder="z. B. 1.3.2a"
                      className="claim-input mt-1 w-full font-mono text-[0.82rem]"
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
                      Art
                    </span>
                    <select
                      value={row.severity}
                      onChange={(event) => {
                        const value = event.target.value as DraftDefect["severity"];
                        setDraft((current) =>
                          current.map((entry, i) =>
                            i === index ? { ...entry, severity: value } : entry,
                          ),
                        );
                      }}
                      className="claim-input mt-1 w-full text-[0.82rem]"
                    >
                      <option value="">—</option>
                      <option value="EM">EM</option>
                      <option value="GM">GM</option>
                    </select>
                  </label>
                  <label className="block min-w-0 sm:col-span-1">
                    <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
                      Mangel
                    </span>
                    <textarea
                      value={row.description}
                      rows={2}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((current) =>
                          current.map((entry, i) =>
                            i === index ? { ...entry, description: value } : entry,
                          ),
                        );
                      }}
                      placeholder="Beschreibung des Mangels"
                      className="claim-input mt-1 min-h-[2.75rem] w-full resize-y text-[0.88rem]"
                    />
                  </label>
                  <PressableButton
                    type="button"
                    variant="button"
                    aria-label="Mangel entfernen"
                    onClick={() => {
                      setDraft((current) =>
                        current.length <= 1
                          ? [emptyDraftRow()]
                          : current.filter((_, i) => i !== index),
                      );
                    }}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl border border-[color:var(--vd-border)] text-[color:var(--vd-muted)] sm:self-center"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </PressableButton>
                </div>
              </li>
            ))}
          </ul>

          <PressableButton
            type="button"
            variant="button"
            onClick={() => {
              setDraft((current) => [...current, emptyDraftRow()]);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--vd-text)]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Mangel hinzufügen
          </PressableButton>

          <div className="flex flex-wrap gap-2">
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
        </div>
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
