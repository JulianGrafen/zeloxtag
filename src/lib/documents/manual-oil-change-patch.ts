import {
  buildManualOilChangeDocumentFields,
  manualOilChangeFormFromDocument,
  resolveManualOilChangeVendor,
  type ManualOilChangeFormValues,
} from "@/lib/documents/manual-oil-change-form";
import type { Document } from "@/types/database";

export type ManualOilChangeFieldPatch = {
  selfMade?: boolean;
  vendor?: string;
  oilSpec?: string;
  oilLiters?: string;
  filterChanged?: boolean;
  notes?: string;
};

export function mergeManualOilChangeFormValues(
  document: Document,
  patch: ManualOilChangeFieldPatch,
): ManualOilChangeFormValues {
  const current = manualOilChangeFormFromDocument(document);
  return {
    ...current,
    ...(patch.selfMade !== undefined ? { selfMade: patch.selfMade } : {}),
    ...(patch.vendor !== undefined ? { vendor: patch.vendor } : {}),
    ...(patch.oilSpec !== undefined ? { oilSpec: patch.oilSpec } : {}),
    ...(patch.oilLiters !== undefined ? { oilLiters: patch.oilLiters } : {}),
    ...(patch.filterChanged !== undefined
      ? { filterChanged: patch.filterChanged }
      : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  };
}

export function buildManualOilChangePersistPatch(
  document: Document,
  patch: ManualOilChangeFieldPatch,
) {
  const merged = mergeManualOilChangeFormValues(document, patch);
  const oilDocument = buildManualOilChangeDocumentFields({
    title: "Ölwechsel",
    oilSpec: merged.oilSpec,
    oilAmountLiters: merged.oilLiters,
    filterChanged: merged.filterChanged,
    notes: merged.notes,
  });
  const vendor = resolveManualOilChangeVendor(
    merged.selfMade ? "true" : "false",
    merged.vendor,
  );

  return {
    title: oilDocument.title,
    category: oilDocument.category,
    notes: oilDocument.notes,
    vendor,
    line_items: null as null,
    amount: null as null,
  };
}
