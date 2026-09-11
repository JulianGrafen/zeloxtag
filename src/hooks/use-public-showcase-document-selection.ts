"use client";

import { useMemo, useState, useTransition } from "react";

import { updatePublicShowcaseDocuments } from "@/actions/update-public-showcase-documents";
import { parseLineItems } from "@/lib/documents/line-items";
import {
  selectedShowcaseLineIndexes,
  showcaseLineItemsFromDocument,
} from "@/lib/vehicles/public-showcase-line-items";
import type { Document } from "@/types/database";

function initialLineSelections(documents: Document[]): Record<string, number[]> {
  const selections: Record<string, number[]> = {};
  for (const doc of documents) {
    const items = parseLineItems(doc.line_items);
    if (!items?.length) continue;
    selections[doc.id] = selectedShowcaseLineIndexes(items);
  }
  return selections;
}

type UsePublicShowcaseDocumentSelectionOptions = {
  vehicleId: string;
  tagUuid: string;
  documents: Document[];
  canEdit: boolean;
};

export function usePublicShowcaseDocumentSelection({
  vehicleId,
  tagUuid,
  documents,
  canEdit,
}: UsePublicShowcaseDocumentSelectionOptions) {
  const initialSelected = useMemo(
    () =>
      new Set(
        documents
          .filter((doc) => doc.show_on_public_showcase)
          .map((doc) => doc.id),
      ),
    [documents],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelected);
  const [lineSelections, setLineSelections] = useState<Record<string, number[]>>(
    () => initialLineSelections(documents),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function persistShowcase(
    nextIds: Set<string>,
    nextLines: Record<string, number[]>,
    rollback?: () => void,
  ) {
    startTransition(async () => {
      setError(null);
      const result = await updatePublicShowcaseDocuments({
        vehicleId,
        tagUuid,
        documentIds: [...nextIds],
        lineSelections: nextLines,
      });

      if (result.status === "error") {
        setError(result.message);
        rollback?.();
        return;
      }

      setMessage("Öffentliche Inhalte aktualisiert.");
    });
  }

  function toggleDocument(doc: Document, enabled: boolean) {
    if (!canEdit) return;

    const previousIds = selectedIds;
    const previousLines = lineSelections;
    const nextIds = new Set(selectedIds);
    const nextLines = { ...lineSelections };
    const positions = showcaseLineItemsFromDocument(doc);

    if (enabled) {
      nextIds.add(doc.id);
      if (positions.length > 0) {
        nextLines[doc.id] = positions.map((item) => item.index);
      }
    } else {
      nextIds.delete(doc.id);
    }

    setSelectedIds(nextIds);
    setLineSelections(nextLines);
    persistShowcase(nextIds, nextLines, () => {
      setSelectedIds(previousIds);
      setLineSelections(previousLines);
    });
  }

  function toggleLineItem(
    documentId: string,
    lineIndex: number,
    enabled: boolean,
  ) {
    if (!canEdit) return;

    const previousIds = selectedIds;
    const previousLines = lineSelections;
    const nextIds = new Set(selectedIds);
    const current = new Set(lineSelections[documentId] ?? []);
    if (enabled) current.add(lineIndex);
    else current.delete(lineIndex);

    const nextLines = {
      ...lineSelections,
      [documentId]: [...current].sort((a, b) => a - b),
    };

    if (enabled) {
      nextIds.add(documentId);
    } else if (current.size === 0) {
      nextIds.delete(documentId);
    }

    setSelectedIds(nextIds);
    setLineSelections(nextLines);
    persistShowcase(nextIds, nextLines, () => {
      setSelectedIds(previousIds);
      setLineSelections(previousLines);
    });
  }

  return {
    selectedIds,
    lineSelections,
    pending,
    message,
    error,
    setMessage,
    setError,
    toggleDocument,
    toggleLineItem,
  };
}
