"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { ShowcaseGalleryReorderGrid } from "@/components/vehicles/showcase-gallery-reorder-grid";

import { deleteDocument } from "@/actions/delete-document";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import {
  MAX_SHOWCASE_GALLERY_PHOTOS,
  filterShowcaseGalleryDocuments,
} from "@/lib/documents/showcase-gallery";
import { showSavedToast } from "@/lib/ui/saved-toast";
import type { Document } from "@/types/database";

type ShowcaseGallerySettingsProps = {
  tagUuid: string;
  vehicleId: string;
  photos: Document[];
  canEdit: boolean;
  onChanged?: () => void;
  /** Hide section title when rendered inside a settings subpage shell. */
  embedded?: boolean;
};

type UploadApiPayload = {
  ok?: boolean;
  error?: string;
  documentId?: string;
  fileUrl?: string;
};

const GALLERY_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

function mapUploadError(
  payload: UploadApiPayload | null,
  status: number,
): string {
  const message = payload?.error?.trim();
  if (message) return message;
  if (status === 0) {
    return "Netzwerkfehler beim Hochladen — bitte Verbindung prüfen.";
  }
  if (status === 401) {
    return "Sitzung abgelaufen — bitte erneut anmelden.";
  }
  if (status === 403) {
    return "Hochladen nicht erlaubt — nur der Fahrzeughalter darf Dateien hochladen.";
  }
  if (status === 409) {
    return `Maximal ${MAX_SHOWCASE_GALLERY_PHOTOS} Fotos erlaubt.`;
  }
  if (status === 413) {
    return "Datei ist zu groß — bitte kleineres Foto wählen.";
  }
  if (status === 415 || status === 422) {
    return "Nur Foto (JPEG, PNG, WebP, HEIC) wird unterstützt.";
  }
  return `Hochladen fehlgeschlagen (Fehler ${status}).`;
}

export function ShowcaseGallerySettings({
  tagUuid,
  vehicleId,
  photos,
  canEdit,
  onChanged,
  embedded = false,
}: ShowcaseGallerySettingsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { compressFile, isCompressing, statusLabel, error: compressError } =
    useDocumentCompression();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const galleryPhotos = filterShowcaseGalleryDocuments(photos);
  const atLimit = galleryPhotos.length >= MAX_SHOWCASE_GALLERY_PHOTOS;
  const busy = uploading || isCompressing || deletingId !== null;

  const uploadFile = useCallback(
    async (file: File): Promise<boolean> => {
      setError(null);
      setUploading(true);

      try {
        const body = new FormData();
        body.append("vehicleId", vehicleId);
        body.append("tagUuid", tagUuid);
        const prepared = await compressFile(file);
        body.append(
          "file",
          prepared.file,
          prepared.file.name || file.name || "galerie-foto",
        );

        const response = await fetch("/api/vehicle/showcase-gallery", {
          method: "POST",
          body,
          credentials: "include",
        });

        let payload: UploadApiPayload | null = null;
        try {
          payload = (await response.json()) as UploadApiPayload;
        } catch {
          payload = null;
        }

        if (!response.ok || !payload?.ok) {
          throw new Error(mapUploadError(payload, response.status));
        }

        onChanged?.();
        showSavedToast();
        return true;
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Hochladen fehlgeschlagen.",
        );
        return false;
      } finally {
        setUploading(false);
      }
    },
    [compressFile, onChanged, tagUuid, vehicleId],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length || !canEdit) return;

    let remaining = MAX_SHOWCASE_GALLERY_PHOTOS - galleryPhotos.length;
    for (const file of Array.from(files)) {
      if (remaining <= 0) break;
      const uploaded = await uploadFile(file);
      if (uploaded) remaining -= 1;
    }

    event.target.value = "";
  }

  const persistGalleryOrder = useCallback(
    async (orderedDocumentIds: string[]) => {
      setError(null);
      const response = await fetch("/api/vehicle/showcase-gallery/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vehicleId,
          tagUuid,
          orderedDocumentIds,
        }),
      });

      let payload: { ok?: boolean; error?: string } | null = null;
      try {
        payload = (await response.json()) as { ok?: boolean; error?: string };
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error?.trim() ||
            `Reihenfolge konnte nicht gespeichert werden (${response.status}).`,
        );
      }

      onChanged?.();
      showSavedToast();
    },
    [onChanged, tagUuid, vehicleId],
  );

  async function handleDelete(documentId: string) {
    if (!canEdit || deletingId) return;

    setError(null);
    setDeletingId(documentId);

    try {
      const result = await deleteDocument({
        documentId,
        vehicleId,
        tagUuid,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      onChanged?.();
      showSavedToast();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {!embedded ? (
        <div>
          <p className="text-[0.88rem] font-medium text-[color:var(--vd-text)]">
            Showcase-Galerie
          </p>
          <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
            Bis zu {MAX_SHOWCASE_GALLERY_PHOTOS} Fotos
            {galleryPhotos.length > 0
              ? ` · ${galleryPhotos.length}/${MAX_SHOWCASE_GALLERY_PHOTOS}`
              : ""}
          </p>
        </div>
      ) : (
        <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
          {galleryPhotos.length}/{MAX_SHOWCASE_GALLERY_PHOTOS} Fotos
        </p>
      )}

      {galleryPhotos.length > 0 ? (
        <ShowcaseGalleryReorderGrid
          photos={galleryPhotos}
          canEdit={canEdit}
          busy={busy}
          deletingId={deletingId}
          onDelete={handleDelete}
          onReorder={async (orderedDocumentIds) => {
            try {
              await persistGalleryOrder(orderedDocumentIds);
            } catch (reorderError) {
              setError(
                reorderError instanceof Error
                  ? reorderError.message
                  : "Reihenfolge konnte nicht gespeichert werden.",
              );
              throw reorderError;
            }
          }}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-[color:var(--vd-border)] px-4 py-3 text-[0.82rem] text-[color:var(--vd-muted)]">
          Noch keine Galerie-Fotos — füge Bilder hinzu, die Besucher im
          öffentlichen Profil sehen.
        </p>
      )}

      {canEdit ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={GALLERY_ACCEPT}
            multiple
            className="sr-only"
            disabled={busy || atLimit}
            onChange={handleFileChange}
          />
          <PressableButton
            type="button"
            variant="button"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-4 py-2.5 text-[0.84rem] font-medium text-[color:var(--vd-text)]"
            disabled={busy || atLimit}
            onClick={() => inputRef.current?.click()}
          >
            {uploading || isCompressing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
            {atLimit
              ? "Limit erreicht"
              : uploading || isCompressing
                ? statusLabel || "Wird hochgeladen…"
                : "Foto hinzufügen"}
          </PressableButton>
        </div>
      ) : null}

      {compressError ? (
        <p className="text-[0.82rem] text-red-600" role="alert">{compressError}</p>
      ) : null}
      {error ? (
        <p className="text-[0.82rem] text-red-600" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
