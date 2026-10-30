"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Trash2 } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  documentMediaKind,
  inlineDocumentProxyUrl,
} from "@/lib/documents/viewable-url";
import type { Document } from "@/types/database";
import { cn } from "@/lib/utils";

type ShowcaseGalleryReorderGridProps = {
  photos: Document[];
  canEdit: boolean;
  busy: boolean;
  deletingId: string | null;
  onDelete: (documentId: string) => void;
  onReorder: (orderedIds: string[]) => Promise<void>;
};

function GalleryTile({
  photo,
  canEdit,
  busy,
  deletingId,
  onDelete,
}: {
  photo: Document;
  canEdit: boolean;
  busy: boolean;
  deletingId: string | null;
  onDelete: (documentId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: photo.id,
    disabled: !canEdit || busy,
  });

  const previewSrc =
    documentMediaKind(photo.file_url) === "image"
      ? inlineDocumentProxyUrl(photo.file_url)
      : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-[4/3] list-none overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]",
        isDragging && "z-20 scale-[1.03] shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
      )}
    >
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt={photo.title}
          className="pointer-events-none h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[0.72rem] text-[color:var(--vd-muted)]">
          Vorschau
        </div>
      )}

      {canEdit ? (
        <>
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label="Foto verschieben"
            className="absolute bottom-1.5 left-1.5 inline-flex h-8 w-8 touch-none items-center justify-center rounded-lg border border-[color:var(--vd-border)] bg-black/55 text-white backdrop-blur-sm active:scale-95"
            disabled={busy}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
          <PressableButton
            type="button"
            variant="button"
            aria-label={`${photo.title} löschen`}
            className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--vd-border)] bg-black/55 text-white backdrop-blur-sm"
            disabled={busy}
            onClick={() => onDelete(photo.id)}
          >
            {deletingId === photo.id ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </PressableButton>
        </>
      ) : null}
    </li>
  );
}

export function ShowcaseGalleryReorderGrid({
  photos,
  canEdit,
  busy,
  deletingId,
  onDelete,
  onReorder,
}: ShowcaseGalleryReorderGridProps) {
  const [items, setItems] = useState(photos);
  const [reordering, setReordering] = useState(false);
  const persistKeyRef = useRef(photos.map((photo) => photo.id).join("|"));

  useEffect(() => {
    const nextKey = photos.map((photo) => photo.id).join("|");
    if (reordering) return;
    setItems(photos);
    persistKeyRef.current = nextKey;
  }, [photos, reordering]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  async function persistOrder(
    nextItems: Document[],
    rollbackItems: Document[],
  ) {
    const nextKey = nextItems.map((photo) => photo.id).join("|");
    if (nextKey === persistKeyRef.current) return;

    setReordering(true);
    try {
      await onReorder(nextItems.map((photo) => photo.id));
      persistKeyRef.current = nextKey;
    } catch {
      setItems(rollbackItems);
    } finally {
      setReordering(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((photo) => photo.id === active.id);
    const newIndex = items.findIndex((photo) => photo.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const rollbackItems = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    void persistOrder(next, rollbackItems);
  }

  const sortableIds = items.map((photo) => photo.id);
  const gridBusy = busy || reordering;

  return (
    <div className="space-y-2">
      {canEdit && items.length > 1 ? (
        <p className="text-[0.75rem] text-[color:var(--vd-muted)]">
          Halte das Griff-Symbol und ziehe, um die Reihenfolge anzupassen.
          {reordering ? " · Speichern…" : null}
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {items.map((photo) => (
              <GalleryTile
                key={photo.id}
                photo={photo}
                canEdit={canEdit}
                busy={gridBusy}
                deletingId={deletingId}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
