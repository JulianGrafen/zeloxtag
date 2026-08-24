"use client";

import { Search, X } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { ListFilterChip } from "@/lib/documents/list-search";

export type ListSearchControlsProps = {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  /** Optional chip row (e.g. category / status). First chip is usually "Alle". */
  chips?: ListFilterChip[];
  activeChipId?: string;
  onChipChange?: (chipId: string) => void;
  /** Second chip row (e.g. Tresor part categories). */
  secondaryChips?: ListFilterChip[];
  secondaryActiveChipId?: string;
  onSecondaryChipChange?: (chipId: string) => void;
  resultLabel?: string;
  className?: string;
};

function ChipRow({
  chips,
  activeChipId,
  onChipChange,
  ariaLabel,
}: {
  chips: ListFilterChip[];
  activeChipId?: string;
  onChipChange: (chipId: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto pb-0.5"
    >
      {chips.map((chip) => {
        const active = activeChipId === chip.id;
        return (
          <PressableButton
            key={chip.id}
            type="button"
            variant="button"
            title={chip.title ?? chip.label}
            onClick={() => onChipChange(chip.id)}
            className={[
              "shrink-0 rounded-full px-3.5 py-2 text-[0.78rem] font-semibold",
              active
                ? "bg-neutral-900 text-white"
                : "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-muted)]",
            ].join(" ")}
          >
            {chip.label}
            {typeof chip.count === "number" ? (
              <span className={active ? "text-white/70" : "text-[color:var(--vd-muted)]"}>
                {" "}
                · {chip.count}
              </span>
            ) : null}
          </PressableButton>
        );
      })}
    </div>
  );
}

/**
 * Search field + optional filter chips for document / Umbau lists.
 */
export function ListSearchControls({
  query,
  onQueryChange,
  placeholder = "Suchen…",
  chips,
  activeChipId,
  onChipChange,
  secondaryChips,
  secondaryActiveChipId,
  onSecondaryChipChange,
  resultLabel,
  className = "",
}: ListSearchControlsProps) {
  return (
    <div className={["space-y-2.5", className].filter(Boolean).join(" ")}>
      <label className="relative block">
        <span className="sr-only">Suchen</span>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[color:var(--vd-muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="claim-input claim-input--search w-full"
        />
        {query ? (
          <button
            type="button"
            aria-label="Suche leeren"
            onClick={() => onQueryChange("")}
            className="absolute right-2 top-1/2 z-[1] inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[color:var(--vd-muted)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </label>

      {chips && chips.length > 0 && onChipChange ? (
        <ChipRow
          chips={chips}
          activeChipId={activeChipId}
          onChipChange={onChipChange}
          ariaLabel="Filter"
        />
      ) : null}

      {secondaryChips && secondaryChips.length > 0 && onSecondaryChipChange ? (
        <ChipRow
          chips={secondaryChips}
          activeChipId={secondaryActiveChipId}
          onChipChange={onSecondaryChipChange}
          ariaLabel="Kategorie"
        />
      ) : null}

      {resultLabel ? (
        <p className="px-0.5 text-[0.72rem] text-[color:var(--vd-muted)]">
          {resultLabel}
        </p>
      ) : null}
    </div>
  );
}
