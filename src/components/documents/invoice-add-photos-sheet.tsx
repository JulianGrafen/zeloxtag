"use client";

import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";

import { appendInvoiceDocumentMedia } from "@/actions/append-invoice-document-media";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import { DOCUMENT_MAX_PAGES } from "@/lib/documents/constants";
import { documentAppendPhotoLimit } from "@/lib/documents/document-page-limits";
import { mergeDocumentWithNewImages } from "@/lib/documents/merge-document-with-images";
import { cacheMockUploadFileInSession } from "@/lib/documents/mock-upload-session-cache";
import {
  documentMediaKind,
  isViewableDocumentUrl,
  resolveDocumentViewUrl,
} from "@/lib/documents/viewable-url";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";

type PhotoDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

type InvoiceAddPhotosSheetProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  fileUrl: string;
  pageCount: number | null;
  title: string;
};

export function InvoiceAddPhotosSheet({
  open,
  onClose,
  onSaved,
  documentId,
  vehicleId,
  tagUuid,
  fileUrl,
  pageCount,
  title,
}: InvoiceAddPhotosSheetProps) {
  const inputId = useId();
  const cameraInputId = `${inputId}-camera`;
  const galleryInputId = `${inputId}-gallery`;
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { compressFile, isCompressing, error: compressError } =
    useDocumentCompression();
  const hasStoredFile = isViewableDocumentUrl(fileUrl);
  const currentPages = hasStoredFile
    ? pageCount != null && pageCount > 0
      ? pageCount
      : 1
    : 0;
  const remainingSlots = documentAppendPhotoLimit(currentPages);
  const busy = pending || isCompressing;

  useEffect(() => {
    if (!open) {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPhotos([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when sheet closes
  }, [open]);

  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, [photos]);

  async function addFiles(fileList: FileList | null) {
    if (!fileList?.length || remainingSlots <= 0) return;
    setError(null);
    const selected = Array.from(fileList).slice(
      0,
      remainingSlots - photos.length,
    );
    const next: PhotoDraft[] = [];

    try {
      for (const raw of selected) {
        const looksLikeImage =
          raw.type.startsWith("image/") ||
          /\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i.test(raw.name);
        if (!looksLikeImage) {
          setError("Nur Bilder (Foto / Galerie) sind erlaubt.");
          continue;
        }
        const compressed = await compressFile(raw);
        const file = compressed.file;
        next.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }
      setPhotos((current) => [...current, ...next].slice(0, remainingSlots));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Bilder konnten nicht geladen werden.",
      );
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
  }

  function handleSave() {
    if (photos.length === 0) {
      setError("Bitte mindestens ein Bild auswählen.");
      return;
    }
    if (remainingSlots <= 0) {
      setError(`Maximal ${DOCUMENT_MAX_PAGES} Seiten pro Beleg.`);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        let uploadFile: File;
        let nextPageCount: number;

        if (hasStoredFile) {
          const previewSrc = resolveDocumentViewUrl(fileUrl);
          const mediaKind = documentMediaKind(fileUrl);
          const merged = await mergeDocumentWithNewImages({
            previewSrc,
            mediaKind,
            pageCount,
            newImageFiles: photos.map((photo) => photo.file),
          });
          uploadFile = merged.file;
          nextPageCount = merged.pageCount;
        } else {
          const merged = await convertImagesToPdf(
            photos.map((photo) => photo.file),
            { fileName: "beleg-fotos", fullBleed: true, imageCompression: "SLOW" },
          );
          uploadFile = merged.file;
          nextPageCount = merged.pageCount;
        }

        if (nextPageCount > DOCUMENT_MAX_PAGES) {
          setError(`Maximal ${DOCUMENT_MAX_PAGES} Seiten pro Beleg.`);
          return;
        }

        const formData = new FormData();
        formData.set("documentId", documentId);
        formData.set("vehicleId", vehicleId);
        formData.set("tagUuid", tagUuid);
        formData.set("pageCount", String(nextPageCount));
        formData.set("photo", uploadFile, uploadFile.name);

        const result = await appendInvoiceDocumentMedia(formData);
        if (result.status === "error") {
          setError(result.message);
          return;
        }

        if (fileUrl.startsWith("mock://") || !hasStoredFile) {
          await cacheMockUploadFileInSession(documentId, uploadFile);
        }

        showSavedToast();
        onSaved();
        onClose();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Bilder konnten nicht gespeichert werden.",
        );
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-neutral-950/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-add-photos-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.5rem))] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-t-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow)] sm:rounded-[1.5rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-[color:var(--vd-border)] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
              Beleg · {title}
            </p>
            <h2
              id="invoice-add-photos-title"
              className="mt-1 font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
            >
              Bilder hinzufügen
            </h2>
            <p className="mt-1 text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
              {hasStoredFile
                ? `Neue Fotos werden an den Beleg angehängt (max. ${DOCUMENT_MAX_PAGES} Seiten gesamt).`
                : "Fotos werden als Dokument zu diesem Eintrag gespeichert."}
              {remainingSlots > 0
                ? ` Noch ${remainingSlots - photos.length} möglich.`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Schließen"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-text)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {remainingSlots <= 0 ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[0.82rem] text-amber-950">
              Dieser Beleg hat bereits {DOCUMENT_MAX_PAGES} Seiten. Entferne ggf.
              alte Seiten, indem du den Beleg neu scannst.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label
                htmlFor={cameraInputId}
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-3 text-[0.88rem] font-semibold text-[color:var(--vd-text)]"
              >
                <Camera className="h-4 w-4" aria-hidden />
                Foto
              </label>
              <label
                htmlFor={galleryInputId}
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-3 text-[0.88rem] font-semibold text-[color:var(--vd-text)]"
              >
                <ImagePlus className="h-4 w-4" aria-hidden />
                Galerie
              </label>
              <input
                id={cameraInputId}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                disabled={busy || photos.length >= remainingSlots}
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <input
                id={galleryInputId}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={busy || photos.length >= remainingSlots}
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>
          )}

          {photos.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <li
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-neutral-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Bild entfernen"
                    disabled={busy}
                    onClick={() => removePhoto(photo.id)}
                    className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950/75 text-white"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {error || compressError ? (
            <p role="alert" className="text-[0.82rem] text-red-600">
              {error || compressError}
            </p>
          ) : null}

          <PressableButton
            type="button"
            variant="button"
            disabled={busy || photos.length === 0 || remainingSlots <= 0}
            onClick={handleSave}
            className="claim-cta flex w-full items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Speichern…
              </>
            ) : (
              "Bilder speichern"
            )}
          </PressableButton>
        </div>
      </div>
    </div>
  );
}
