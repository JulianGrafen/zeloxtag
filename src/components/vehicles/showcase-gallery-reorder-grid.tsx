"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
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
  onDragEnd,
}: {
  photo: Document;
  canEdit: boolean;
  busy: boolean;
  deletingId: string | null;
  onDelete: (documentId: string) => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();
  const previewSrc =
    documentMediaKind(photo.file_url) === "image"
      ? inlineDocumentProxyUrl(photo.file_url)
      : null;

  return (
    <Reorder.Item
      value={photo}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative aspect-[4/3] list-none overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]",
        canEdit && "touch-none",
      )}
      whileDrag={{
        scale: 1.03,
        zIndex: 20,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }}
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
            aria-label="Foto verschieben"
            className="absolute bottom-1.5 left-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--vd-border)] bg-black/55 text-white backdrop-blur-sm active:scale-95"
            disabled={busy}
            onPointerDown={(event) => {
              dragControls.start(event);
            }}
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
    </Reorder.Item>
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
    setItems(photos);
    persistKeyRef.current = photos.map((photo) => photo.id).join("|");
  }, [photos]);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  async function persistOrder() {
    const next = itemsRef.current;
    const nextKey = next.map((photo) => photo.id).join("|");
    if (nextKey === persistKeyRef.current) return;

    setReordering(true);
    try {
      await onReorder(next.map((photo) => photo.id));
      persistKeyRef.current = nextKey;
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="space-y-2">
      {canEdit && items.length > 1 ? (
        <p className="text-[0.75rem] text-[color:var(--vd-muted)]">
          Halte das Griff-Symbol und ziehe, um die Reihenfolge anzupassen.
          {reordering ? " · Speichern…" : null}
        </p>
      ) : null}
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={(next) => {
          setItems(next);
          itemsRef.current = next;
        }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        as="ul"
      >
        {items.map((photo) => (
          <GalleryTile
            key={photo.id}
            photo={photo}
            canEdit={canEdit}
            busy={busy || reordering}
            deletingId={deletingId}
            onDelete={onDelete}
            onDragEnd={() => {
              void persistOrder();
            }}
          />
        ))}
      </Reorder.Group>
    </div>
  );
}
