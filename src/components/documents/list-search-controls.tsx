"use client";

import { IOSFilterChips, IOSSearchField } from "@/components/ui/ios";
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

/**
 * Search field + optional filter chips for document / Umbau lists.
 */
export function ListSearchControls({
  query,
  onQueryChange,
  placeholder = "Suchen",
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
    <div className={["space-y-3", className].filter(Boolean).join(" ")}>
      <IOSSearchField
        value={query}
        onChange={onQueryChange}
        placeholder={placeholder}
      />

      {chips && chips.length > 0 && onChipChange ? (
        <IOSFilterChips
          chips={chips}
          activeId={activeChipId}
          onChange={onChipChange}
          ariaLabel="Filter"
        />
      ) : null}

      {secondaryChips && secondaryChips.length > 0 && onSecondaryChipChange ? (
        <IOSFilterChips
          chips={secondaryChips}
          activeId={secondaryActiveChipId}
          onChange={onSecondaryChipChange}
          ariaLabel="Kategorie"
        />
      ) : null}

      {resultLabel ? (
        <p className="px-4 text-xs tabular-nums text-[#8E8E93]">{resultLabel}</p>
      ) : null}
    </div>
  );
}
