"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

import { TuevDefectsSection } from "./tuev-defects-section";
import {
  draftRowsToReportDefects,
  TuevDefectsDraftEditor,
  type DraftDefect,
} from "./tuev-defects-draft-editor";

type TuevDefectsEditableBlockProps = {
  draft: DraftDefect[];
  onChange: (next: DraftDefect[]) => void;
  disabled?: boolean;
  emptyHint?: string;
  /** Collapse edit mode after review (scan confirm). Default: true. */
  showDoneButton?: boolean;
};

/**
 * Festgestellte Mängel — read-only until the user taps the block.
 */
export function TuevDefectsEditableBlock({
  draft,
  onChange,
  disabled = false,
  emptyHint = "Keine Mängel erkannt. Tippen zum Eintragen oder Ergänzen.",
  showDoneButton = true,
}: TuevDefectsEditableBlockProps) {
  const [editing, setEditing] = useState(false);
  const displayData = draftRowsToReportDefects(draft);

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        className="group w-full rounded-xl border border-transparent text-left transition-colors hover:border-[color:var(--vd-border)] hover:bg-[color:var(--vd-surface-elevated)]/40 active:bg-[color:var(--vd-surface-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="p-1">
          <TuevDefectsSection
            data={displayData}
            asSection={false}
            emptyHint={emptyHint}
          />
          <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] font-medium text-[color:var(--vd-muted)] group-hover:text-[color:var(--vd-text)]">
            <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Tippen zum Bearbeiten
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <TuevDefectsDraftEditor
        draft={draft}
        onChange={onChange}
        disabled={disabled}
      />
      {showDoneButton ? (
        <PressableButton
          type="button"
          variant="button"
          disabled={disabled}
          onClick={() => setEditing(false)}
          className="inline-flex items-center justify-center rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-4 py-2.5 text-[0.82rem] font-medium text-[color:var(--vd-text)]"
        >
          Fertig
        </PressableButton>
      ) : null}
    </div>
  );
}
