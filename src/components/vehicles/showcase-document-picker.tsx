"use client";

import {
  formatShowcaseDocumentLabel,
} from "@/lib/vehicles/public-showcase-documents";
import { showcaseLineItemsFromDocument } from "@/lib/vehicles/public-showcase-line-items";
import type { Document } from "@/types/database";

function DocumentCheckboxRow({
  label,
  meta,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  meta?: string | null;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-[0.84rem] font-medium text-[color:var(--vd-text)]">
          {label}
        </span>
        {meta ? (
          <span className="mt-0.5 block text-[0.74rem] text-[color:var(--vd-muted)]">
            {meta}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--vd-accent)]"
      />
    </label>
  );
}

export function ShowcaseDocumentPicker({
  doc,
  meta,
  selected,
  selectedLines,
  disabled,
  onToggleDocument,
  onToggleLine,
}: {
  doc: Document;
  meta?: string | null;
  selected: boolean;
  selectedLines: number[];
  disabled?: boolean;
  onToggleDocument: (value: boolean) => void;
  onToggleLine: (index: number, value: boolean) => void;
}) {
  const positions = showcaseLineItemsFromDocument(doc);
  const selectedSet = new Set(selectedLines);

  return (
    <div className="space-y-1.5">
      <DocumentCheckboxRow
        label={formatShowcaseDocumentLabel(doc)}
        meta={meta}
        checked={selected}
        disabled={disabled}
        onChange={onToggleDocument}
      />
      {selected && positions.length > 0 ? (
        <div className="ml-3 space-y-1 border-l border-[color:var(--vd-border)] pl-3">
          <p className="px-1 text-[0.72rem] text-[color:var(--vd-muted)]">
            Sichtbare Positionen
          </p>
          {positions.map((item) => (
            <DocumentCheckboxRow
              key={`${doc.id}-${item.index}`}
              label={item.label}
              checked={selectedSet.has(item.index)}
              disabled={disabled}
              onChange={(value) => onToggleLine(item.index, value)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
