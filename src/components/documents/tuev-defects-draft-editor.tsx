"use client";

import { Plus, Trash2 } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { parseTuevDefectLine } from "@/lib/ocr/tuev-defects-from-text";
import type { TuevDefectRow, TuevReport } from "@/lib/validations/documentSchemas";

export type DraftDefect = {
  key: string;
  checkpoint: string;
  description: string;
  severity: "" | "EM" | "GM";
};

export function emptyDraftRow(): DraftDefect {
  return {
    key: crypto.randomUUID(),
    checkpoint: "",
    description: "",
    severity: "",
  };
}

export function toDraftRows(
  data: Pick<TuevReport, "defectsTable" | "defectsList">,
): DraftDefect[] {
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

export function parseDraftRows(draft: DraftDefect[]): TuevDefectRow[] {
  const rows: TuevDefectRow[] = [];

  for (const row of draft) {
    const description = row.description.trim().slice(0, 500);
    if (!description) continue;

    const checkpoint = row.checkpoint.trim().slice(0, 24) || null;
    rows.push({
      checkpoint,
      description,
      severity:
        row.severity === "EM" || row.severity === "GM" ? row.severity : null,
    });

    if (rows.length >= 80) break;
  }

  return rows;
}

export function draftRowsToReportDefects(
  draft: DraftDefect[],
): Pick<TuevReport, "defectsTable" | "defectsList"> {
  const rows = parseDraftRows(draft);
  return {
    defectsTable: rows.length > 0 ? rows : null,
    defectsList: null,
  };
}

type TuevDefectsDraftEditorProps = {
  draft: DraftDefect[];
  onChange: (next: DraftDefect[]) => void;
  disabled?: boolean;
};

/** Inline editor for festgestellte Mängel (scan review + saved documents). */
export function TuevDefectsDraftEditor({
  draft,
  onChange,
  disabled = false,
}: TuevDefectsDraftEditorProps) {
  return (
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
                  disabled={disabled}
                  onChange={(event) => {
                    const value = event.target.value;
                    onChange(
                      draft.map((entry, i) =>
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
                  disabled={disabled}
                  onChange={(event) => {
                    const value = event.target.value as DraftDefect["severity"];
                    onChange(
                      draft.map((entry, i) =>
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
                  disabled={disabled}
                  onChange={(event) => {
                    const value = event.target.value;
                    onChange(
                      draft.map((entry, i) =>
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
                disabled={disabled}
                aria-label="Mangel entfernen"
                onClick={() => {
                  onChange(
                    draft.length <= 1
                      ? [emptyDraftRow()]
                      : draft.filter((_, i) => i !== index),
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
        disabled={disabled}
        onClick={() => {
          onChange([...draft, emptyDraftRow()]);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--vd-text)]"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Mangel hinzufügen
      </PressableButton>
    </div>
  );
}
