"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  abeAuflagenEntriesFromConditions,
  parseAbeAuflagenNotes,
  type AbeAuflageEntry,
} from "@/lib/ocr/abe-auflagen-from-text";
import { normalizeAuflagenKuerzel } from "@/lib/ocr/auflagen-kuerzel-db";

type AbeAuflagenFoldListProps = {
  /** Raw OCR text (wizard / review). */
  notes?: string | null;
  /** Saved document conditions (`CODE: text` rows). */
  conditions?: string[];
  /** Saved structured snippets from approval_fields. */
  snippets?: Array<{ code: string; text: string; imageUrl?: string | null }>;
  /** Kürzel from vehicle table — improves splitting. */
  knownCodes?: string[];
  /** Kürzel still missing text (not in DB / not yet scanned). */
  pendingCodes?: string[];
  /** Global / session image lookup by code. */
  imageUrlsByCode?: Map<string, string> | ReadonlyMap<string, string>;
  /** First section open by default (review). */
  defaultOpenFirst?: boolean;
};

function resolveImageUrl(
  code: string,
  snippets: AbeAuflagenFoldListProps["snippets"],
  imageUrlsByCode?: Map<string, string> | ReadonlyMap<string, string>,
): string | null {
  const normalized = normalizeAuflagenKuerzel(code);
  const fromMap = imageUrlsByCode?.get(normalized);
  if (fromMap) return fromMap;

  const fromSnippet = snippets?.find(
    (snippet) => normalizeAuflagenKuerzel(snippet.code) === normalized,
  )?.imageUrl;
  return fromSnippet?.trim() || null;
}

function AuflagePaperImage({ src, code }: { src: string; code: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-neutral-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Auflage ${code} aus dem Papier`}
        className="max-h-72 w-full bg-white object-contain"
        loading="eager"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function resolveEntries({
  notes,
  conditions,
  snippets,
  knownCodes,
}: AbeAuflagenFoldListProps): AbeAuflageEntry[] {
  if (snippets && snippets.length > 0) {
    return snippets.map((snippet) => ({
      code: snippet.code,
      text: snippet.text,
    }));
  }

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
  snippets,
  knownCodes = [],
  pendingCodes = [],
  imageUrlsByCode,
  defaultOpenFirst = false,
}: AbeAuflagenFoldListProps) {
  const entries = resolveEntries({ notes, conditions, snippets, knownCodes });
  const pendingSet = new Set(
    pendingCodes.map((code) => normalizeAuflagenKuerzel(code)).filter(Boolean),
  );
  const coveredCodes = new Set(
    entries.map((entry) => normalizeAuflagenKuerzel(entry.code)),
  );

  for (const code of pendingSet) {
    if (!coveredCodes.has(code)) {
      entries.push({ code, text: "" });
    }
  }

  if (entries.length === 0 && pendingSet.size === 0) {
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
      {entries.map((entry, index) => {
        const imageUrl = resolveImageUrl(entry.code, snippets, imageUrlsByCode);
        const normalized = normalizeAuflagenKuerzel(entry.code);
        const isPending = pendingSet.has(normalized) && !entry.text.trim();
        return (
          <details
            key={`${entry.code}-${index}`}
            open={defaultOpenFirst && index === 0}
            className={[
              "group rounded-xl border bg-[color:var(--vd-surface-elevated)]",
              isPending
                ? "border-amber-300/70"
                : "border-[color:var(--vd-border)]",
            ].join(" ")}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-mono text-[0.88rem] font-semibold tracking-wide text-[color:var(--vd-text)]">
                  {entry.code}
                </span>
                {isPending ? (
                  <span className="text-[0.72rem] font-normal text-amber-800">
                    Noch nicht fotografiert
                  </span>
                ) : null}
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="border-t border-[color:var(--vd-border)] px-3 py-3">
              {isPending ? (
                <p className="text-[0.82rem] leading-relaxed text-amber-900">
                  Dieses Kürzel ist nicht in der Datenbank. Bitte den
                  Auflagen-Text auf deiner ABE fotografieren — Text und
                  Ausschnitt werden gespeichert.
                </p>
              ) : (
                <>
                  {imageUrl ? (
                    <AuflagePaperImage src={imageUrl} code={entry.code} />
                  ) : null}
                  <p className="whitespace-pre-wrap text-[0.88rem] leading-relaxed text-[color:var(--vd-text)]">
                    {entry.text.trim() || "—"}
                  </p>
                </>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
