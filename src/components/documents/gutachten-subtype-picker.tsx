"use client";

import {
  GUTACHTEN_DOCUMENT_SUBTYPES,
  GUTACHTEN_SUBTYPE_LABELS,
  type GutachtenDocumentSubtype,
} from "@/lib/validations/gutachtenSchema";

const PICKER_SUBTYPES: GutachtenDocumentSubtype[] = [
  "TEILEGUTACHTEN",
  "ANBAUBESTAETIGUNG",
  "EINZELABNAHME",
];

export function GutachtenSubtypePicker({
  onSelect,
}: {
  onSelect: (subtype: GutachtenDocumentSubtype) => void;
}) {
  return (
    <div className="space-y-3 rounded-[1.25rem] border border-amber-200 bg-amber-50/80 p-4">
      <p className="text-[0.82rem] font-medium text-amber-950">
        Dokumenttyp unklar — bitte auswählen:
      </p>
      <div className="grid gap-2">
        {PICKER_SUBTYPES.map((subtype) => (
          <button
            key={subtype}
            type="button"
            onClick={() => onSelect(subtype)}
            className="rounded-xl border border-amber-200/80 bg-white px-4 py-3 text-left text-[0.88rem] font-semibold text-neutral-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            {GUTACHTEN_SUBTYPE_LABELS[subtype]}
          </button>
        ))}
      </div>
    </div>
  );
}

export { PICKER_SUBTYPES, GUTACHTEN_DOCUMENT_SUBTYPES };
