"use client";

import { useMemo, useState, useTransition } from "react";

import { updatePublicShowcaseDocuments } from "@/actions/update-public-showcase-documents";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { parseLineItems } from "@/lib/documents/line-items";
import { isBuildStoryEligibleDocument } from "@/lib/vehicles/build-story-document";
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

function initialBuildStoryIds(documents: Document[]): Set<string> {
  return new Set(
    documents
      .filter(
        (doc) =>
          doc.show_on_build_story === true && isBuildStoryEligibleDocument(doc),
      )
      .map((doc) => doc.id),
  );
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

  const initialBuildStory = useMemo(
    () => initialBuildStoryIds(documents),
    [documents],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelected);
  const [buildStoryIds, setBuildStoryIds] =
    useState<Set<string>>(initialBuildStory);
  const [lineSelections, setLineSelections] = useState<Record<string, number[]>>(
    () => initialLineSelections(documents),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function persistShowcase(
    nextIds: Set<string>,
    nextLines: Record<string, number[]>,
    nextBuildStoryIds: Set<string>,
    rollback?: () => void,
  ) {
    startTransition(async () => {
      setError(null);
      const result = await updatePublicShowcaseDocuments({
        vehicleId,
        tagUuid,
        documentIds: [...nextIds],
        lineSelections: nextLines,
        buildStoryDocumentIds: [...nextBuildStoryIds],
      });

      if (result.status === "error") {
        setError(result.message);
        rollback?.();
        return;
      }

      showSavedToast();
      setMessage(null);
    });
  }

  function toggleDocument(doc: Document, enabled: boolean) {
    if (!canEdit) return;

    const previousIds = selectedIds;
    const previousLines = lineSelections;
    const previousBuildStory = buildStoryIds;
    const nextIds = new Set(selectedIds);
    const nextLines = { ...lineSelections };
    const nextBuildStory = new Set(buildStoryIds);
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
    persistShowcase(nextIds, nextLines, nextBuildStory, () => {
      setSelectedIds(previousIds);
      setLineSelections(previousLines);
      setBuildStoryIds(previousBuildStory);
    });
  }

  function toggleBuildStory(doc: Document, enabled: boolean) {
    if (!canEdit || !isBuildStoryEligibleDocument(doc)) return;

    const previousIds = selectedIds;
    const previousLines = lineSelections;
    const previousBuildStory = buildStoryIds;
    const nextBuildStory = new Set(buildStoryIds);
    if (enabled) nextBuildStory.add(doc.id);
    else nextBuildStory.delete(doc.id);

    setBuildStoryIds(nextBuildStory);
    persistShowcase(selectedIds, lineSelections, nextBuildStory, () => {
      setSelectedIds(previousIds);
      setLineSelections(previousLines);
      setBuildStoryIds(previousBuildStory);
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
    const previousBuildStory = buildStoryIds;
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
    persistShowcase(nextIds, nextLines, buildStoryIds, () => {
      setSelectedIds(previousIds);
      setLineSelections(previousLines);
      setBuildStoryIds(previousBuildStory);
    });
  }

  return {
    selectedIds,
    buildStoryIds,
    lineSelections,
    pending,
    message,
    error,
    setMessage,
    setError,
    toggleDocument,
    toggleBuildStory,
    toggleLineItem,
  };
}
