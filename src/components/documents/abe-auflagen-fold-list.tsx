"use client";

import { ChevronDown } from "lucide-react";

import {
  abeAuflagenEntriesFromConditions,
  parseAbeAuflagenNotes,
  type AbeAuflageEntry,
} from "@/lib/ocr/abe-auflagen-from-text";

type AbeAuflagenFoldListProps = {
  /** Raw OCR text (wizard / review). */
  notes?: string | null;
  /** Saved document conditions (`CODE: text` rows). */
  conditions?: string[];
  /** Kürzel from vehicle table — improves splitting. */
  knownCodes?: string[];
  /** First section open by default (review). */
  defaultOpenFirst?: boolean;
};

function resolveEntries({
  notes,
  conditions,
  knownCodes,
}: AbeAuflagenFoldListProps): AbeAuflageEntry[] {
  if (conditions && conditions.length > 0) {
    const fromConditions = abeAuflagenEntriesFromConditions(conditions);
    if (fromConditions.some((entry) => entry.text.trim())) {
      return fromConditions;
    }
  }
  return parseAbeAuflagenNotes(notes ?? "", knownCodes ?? []);
}

export function AbeAuflagenFoldList({
  notes = null,
  conditions,
  knownCodes = [],
  defaultOpenFirst = false,
}: AbeAuflagenFoldListProps) {
  const entries = resolveEntries({ notes, conditions, knownCodes });

  if (entries.length === 0) {
    return (
      <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
        {notes?.trim() || "Noch keine Auflagen erfasst."}
      </p>
    );
  }

  if (entries.length === 1 && !entries[0]?.text.trim()) {
    return (
      <p className="font-mono text-[0.88rem] font-semibold text-[color:var(--vd-text)]">
        {entries[0]?.code}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <details
          key={`${entry.code}-${index}`}
          open={defaultOpenFirst && index === 0}
          className="group rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-[0.88rem] font-semibold tracking-wide text-[color:var(--vd-text)]">
              {entry.code}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-[color:var(--vd-border)] px-3 py-3">
            <p className="whitespace-pre-wrap text-[0.88rem] leading-relaxed text-[color:var(--vd-text)]">
              {entry.text.trim() || "—"}
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
