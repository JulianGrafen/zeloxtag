"use client";

import { ChevronDown } from "lucide-react";

import {
  groupTeilegutachtenAuflagen,
  splitAuflageHeading,
} from "@/lib/validations/teilegutachten-auflagen";

function summarizeAuflagen(conditions: string[]): string {
  const grouped = groupTeilegutachtenAuflagen(conditions);
  if (grouped.length === 0) return "Keine Auflagen";
  if (grouped.length === 1) {
    const { heading } = splitAuflageHeading(grouped[0] ?? "");
    if (heading) return heading;
    return "1 Auflage";
  }
  return `${grouped.length} Auflagen`;
}

type CollapsibleAuflagenListProps = {
  conditions: string[];
  defaultOpen?: boolean;
};

/**
 * Compact, expandable Auflagen list — default collapsed for long TGA boilerplate.
 */
export function CollapsibleAuflagenList({
  conditions,
  defaultOpen = false,
}: CollapsibleAuflagenListProps) {
  const grouped = groupTeilegutachtenAuflagen(conditions);

  if (grouped.length === 0) {
    return (
      <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
        Keine Auflagen erkannt.
      </p>
    );
  }

  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[0.88rem] font-medium text-[color:var(--vd-text)] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">{summarizeAuflagen(conditions)}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ol className="space-y-3 border-t border-[color:var(--vd-border)] px-3 py-3">
        {grouped.map((condition, index) => {
          const { heading, body } = splitAuflageHeading(condition);
          return (
            <li
              key={`${index}-${condition.slice(0, 48)}`}
              className="flex gap-3 rounded-xl bg-[color:var(--vd-surface)] p-3 text-[0.88rem]"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[0.7rem] font-semibold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 pt-0.5 leading-relaxed text-[color:var(--vd-text)]">
                {heading ? (
                  <p className="font-semibold tracking-[-0.02em]">{heading}</p>
                ) : null}
                <p
                  className={
                    heading ? "mt-1 whitespace-pre-wrap" : "whitespace-pre-wrap"
                  }
                >
                  {heading ? body : condition}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
