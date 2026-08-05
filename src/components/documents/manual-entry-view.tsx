"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  NotebookPen,
  Plus,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import { createManualVehicleEntry } from "@/actions/create-manual-entry";
import { deleteDocument } from "@/actions/delete-document";
import { ListSearchControls } from "@/components/documents/list-search-controls";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import {
  displayDocumentTitle,
  formatDocumentAmount,
  formatDocumentDate,
} from "@/lib/documents/format";
import { matchesSearchQuery } from "@/lib/documents/list-search";
import {
  filterManualVehicleEntries,
  MANUAL_ENTRY_CATEGORIES,
  MANUAL_ENTRY_CATEGORY_LABELS,
  MANUAL_ENTRY_MAX_PHOTOS,
  type ManualEntryCategory,
} from "@/lib/documents/manual-entries";
import {
  documentMediaKind,
  inlineDocumentProxyUrl,
  isViewableDocumentUrl,
} from "@/lib/documents/viewable-url";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import type { Document } from "@/types/database";

export type ManualListFilter = "all" | ManualEntryCategory | "photos";

interface ManualEntryViewProps {
  tagUuid: string;
  vehicleId: string;
  vehicleLabel: string;
  documents: Document[];
  /** Prefill list filter (e.g. "tuning" for Umbau-Bilder). */
  initialListFilter?: ManualListFilter;
  /** Override page heading for Umbauten surface. */
  heading?: string;
  subheading?: string;
}

type PhotoDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

export function ManualEntryView({
  tagUuid,
  vehicleId,
  vehicleLabel,
  documents,
  initialListFilter = "all",
  heading = "Wartung & Tuning",
  subheading = "Einträge mit optionalen Fotos",
}: ManualEntryViewProps) {
  const router = useRouter();
  const { compressFile, isCompressing, statusLabel, error: compressError } =
    useDocumentCompression();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ManualEntryCategory>(
    initialListFilter === "tuning" || initialListFilter === "service"
      ? initialListFilter
      : "service",
  );
  const [listFilter, setListFilter] =
    useState<ManualListFilter>(initialListFilter);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const entries = filterManualVehicleEntries(documents);

  const listChips = useMemo(() => {
    const withPhoto = entries.filter((doc) =>
      isViewableDocumentUrl(doc.file_url),
    ).length;
    const serviceCount = entries.filter(
      (doc) => doc.category === "service",
    ).length;
    const tuningCount = entries.filter(
      (doc) => doc.category === "tuning",
    ).length;
    return [
      { id: "all", label: "Alle", count: entries.length },
      { id: "tuning", label: "Umbau / Tuning", count: tuningCount },
      { id: "service", label: "Wartung", count: serviceCount },
      { id: "photos", label: "Mit Foto", count: withPhoto },
    ];
  }, [entries]);

  const visibleEntries = useMemo(() => {
    return entries.filter((doc) => {
      if (listFilter === "service" || listFilter === "tuning") {
        if (doc.category !== listFilter) return false;
      }
      if (listFilter === "photos" && !isViewableDocumentUrl(doc.file_url)) {
        return false;
      }
      return matchesSearchQuery(
        query,
        doc.title,
        doc.vendor,
        doc.notes,
        doc.category,
        MANUAL_ENTRY_CATEGORY_LABELS[
          doc.category === "tuning" ? "tuning" : "service"
        ],
      );
    });
  }, [entries, listFilter, query]);

  const searchResultLabel =
    visibleEntries.length === entries.length
      ? undefined
      : `${visibleEntries.length} von ${entries.length} Einträgen`;

  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
    // Only revoke on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, []);

  function resetForm() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setTitle("");
    setDate("");
    setAmount("");
    setVendor("");
    setMileageKm("");
    setNotes("");
    setPhotos([]);
    setCategory("service");
    setError(null);
  }

  async function addPhotoFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    const remaining = MANUAL_ENTRY_MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`Maximal ${MANUAL_ENTRY_MAX_PHOTOS} Fotos pro Eintrag.`);
      return;
    }

    const selected = Array.from(fileList).slice(0, remaining);
    const next: PhotoDraft[] = [];
    let rejectReason: string | null = null;

    try {
      for (const raw of selected) {
        // iOS often sends an empty MIME type — fall back to extension.
        const looksLikeImage =
          raw.type.startsWith("image/") ||
          /\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i.test(raw.name);
        if (!looksLikeImage) {
          rejectReason = "Nur Bilder (Foto / Galerie) sind erlaubt.";
          continue;
        }
        const compressed = await compressFile(raw);
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: compressed.file,
          previewUrl: URL.createObjectURL(compressed.file),
        });
      }
      if (next.length > 0) {
        setPhotos((prev) => [...prev, ...next].slice(0, MANUAL_ENTRY_MAX_PHOTOS));
      } else {
        setError(rejectReason ?? "Kein Foto konnte hinzugefügt werden.");
      }
    } catch (photoError) {
      setError(
        photoError instanceof Error
          ? photoError.message
          : "Foto konnte nicht vorbereitet werden.",
      );
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((photo) => photo.id !== id);
    });
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("vehicleId", vehicleId);
        formData.set("tagUuid", tagUuid);
        formData.set("category", category);
        formData.set(
          "title",
          title.trim() ||
            (category === "tuning" ? "Tuning-Eintrag" : "Wartungseintrag"),
        );
        formData.set("date", date);
        formData.set("amount", amount);
        formData.set("vendor", vendor);
        formData.set("mileageKm", mileageKm);
        formData.set("notes", notes);

        if (photos.length === 1) {
          formData.set("photo", photos[0].file, photos[0].file.name);
        } else if (photos.length > 1) {
          const pdf = await convertImagesToPdf(
            photos.map((photo) => photo.file),
            {
              fileName: "eintrag-fotos",
              fullBleed: true,
            },
          );
          formData.set("photo", pdf.file, pdf.file.name);
          formData.set("pageCount", String(pdf.pageCount));
        }

        const result = await createManualVehicleEntry(formData);
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        resetForm();
        setShowForm(false);
        router.refresh();
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : "Eintrag konnte nicht gespeichert werden.",
        );
      }
    });
  }

  function handleDelete(documentId: string) {
    setError(null);
    setPendingId(documentId);
    startTransition(async () => {
      const result = await deleteDocument({
        documentId,
        vehicleId,
        tagUuid,
      });
      setPendingId(null);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  const busy = pending || isCompressing;

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <PressableLink
            href={`/v/${tagUuid}`}
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Dashboard
          </PressableLink>

          <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <NotebookPen className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Eigene Doku
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
              {heading}
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleLabel} · {subheading}
            </p>
          </div>
        </header>

        {!showForm ? (
          <ListSearchControls
            query={query}
            onQueryChange={setQuery}
            placeholder="Titel, Notiz, Werkstatt…"
            chips={listChips}
            activeChipId={listFilter}
            onChipChange={(id) => setListFilter(id as ManualListFilter)}
            resultLabel={searchResultLabel}
          />
        ) : null}

        {error || compressError ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
          >
            {error || compressError}
          </p>
        ) : null}

        {showForm ? (
          <form
            className="space-y-3 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreate();
            }}
          >
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              Art
            </p>
            <div className="grid grid-cols-2 gap-2">
              {MANUAL_ENTRY_CATEGORIES.map((id) => (
                <PressableButton
                  key={id}
                  type="button"
                  variant="button"
                  onClick={() => setCategory(id)}
                  className={`rounded-xl border px-3 py-3 text-left text-[0.85rem] font-semibold ${
                    category === id
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-[color:var(--vd-border)] bg-white text-[color:var(--vd-text)]"
                  }`}
                >
                  {MANUAL_ENTRY_CATEGORY_LABELS[id]}
                </PressableButton>
              ))}
            </div>

            <label className="block space-y-1.5">
              <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Titel
              </span>
              <input
                required
                minLength={2}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="claim-input w-full"
                placeholder={
                  category === "tuning"
                    ? "z. B. Fahrwerk eingebaut"
                    : "z. B. Ölwechsel selbst gemacht"
                }
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Datum
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="claim-input w-full"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                  Betrag (€)
                </span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="claim-input w-full"
                  placeholder="optional"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Werkstatt / Quelle
              </span>
              <input
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
                className="claim-input w-full"
                placeholder="optional"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Kilometerstand
              </span>
              <input
                inputMode="numeric"
                value={mileageKm}
                onChange={(event) => setMileageKm(event.target.value)}
                className="claim-input w-full"
                placeholder="optional"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Notiz
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="claim-input w-full resize-none"
                placeholder="Was wurde gemacht?"
              />
            </label>

            <div className="space-y-2">
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Fotos{" "}
                <span className="normal-case tracking-normal text-[color:var(--vd-muted)]">
                  (optional, max. {MANUAL_ENTRY_MAX_PHOTOS})
                </span>
              </p>

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
                        aria-label="Foto entfernen"
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

              {photos.length < MANUAL_ENTRY_MAX_PHOTOS ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="claim-back relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden">
                    <input
                      type="file"
                      accept="image/*,.heic,.heif"
                      capture="environment"
                      disabled={busy}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      onChange={(event) => {
                        void addPhotoFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <Camera className="h-4 w-4" aria-hidden />
                    Kamera
                  </label>
                  <label className="claim-back relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden">
                    <input
                      type="file"
                      accept="image/*,.heic,.heif"
                      multiple
                      disabled={busy}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      onChange={(event) => {
                        void addPhotoFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    Galerie
                  </label>
                </div>
              ) : null}

              {statusLabel ? (
                <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
                  {statusLabel}
                </p>
              ) : null}
            </div>

            <div className="flex gap-2 pt-1">
              <PressableButton
                type="button"
                variant="button"
                disabled={busy}
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="claim-back flex-1"
              >
                Abbrechen
              </PressableButton>
              <PressableButton
                type="submit"
                variant="button"
                disabled={busy || title.trim().length < 2}
                className="claim-cta flex-1 disabled:opacity-60"
              >
                {busy ? "Speichern…" : "Eintrag speichern"}
              </PressableButton>
            </div>
          </form>
        ) : null}

        <section aria-label="Eigene Einträge" className="space-y-2">
          {entries.length === 0 ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-[0.9rem] text-[color:var(--vd-muted)] shadow-[var(--vd-shadow-sm)]">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                <Wrench className="h-5 w-5" aria-hidden />
              </div>
              <p className="font-medium text-[color:var(--vd-text)]">
                Noch keine eigenen Einträge
              </p>
              <p className="mt-1">
                Trage Wartungen oder Tuning-Arbeiten ein und dokumentiere sie
                optional mit Fotos.
              </p>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-[0.9rem] text-[color:var(--vd-muted)] shadow-[var(--vd-shadow-sm)]">
              Keine Treffer für diese Suche / Filter.
            </div>
          ) : (
            <ul className="vd-anim-list overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
              {visibleEntries.map((doc) => {
                const kind =
                  doc.category === "tuning"
                    ? MANUAL_ENTRY_CATEGORY_LABELS.tuning
                    : MANUAL_ENTRY_CATEGORY_LABELS.service;
                const amountLabel = formatDocumentAmount(doc.amount);
                const hasPhoto = isViewableDocumentUrl(doc.file_url);
                const thumbSrc = hasPhoto
                  ? inlineDocumentProxyUrl(doc.file_url)
                  : null;
                const isImage =
                  hasPhoto && documentMediaKind(doc.file_url) === "image";

                return (
                  <li
                    key={doc.id}
                    className="flex w-full items-center gap-2 border-b border-[color:var(--vd-border)] px-3 py-3 last:border-b-0 sm:px-4"
                  >
                    <PressableLink
                      href={`/v/${tagUuid}/dokumente/${doc.id}`}
                      variant="row"
                      className="vd-pressable vd-pressable--row group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left"
                    >
                      <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                        {thumbSrc && isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbSrc}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <NotebookPen className="h-5 w-5" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                          {displayDocumentTitle(doc.title)}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.75rem] text-[color:var(--vd-muted)]">
                          {kind}
                          {" · "}
                          {formatDocumentDate(doc.date)}
                          {amountLabel ? ` · ${amountLabel}` : ""}
                          {hasPhoto ? " · Foto" : ""}
                        </span>
                      </span>
                    </PressableLink>
                    <PressableButton
                      type="button"
                      variant="button"
                      aria-label={`Löschen: ${displayDocumentTitle(doc.title)}`}
                      disabled={pending && pendingId === doc.id}
                      onClick={() => handleDelete(doc.id)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--vd-border)] bg-white text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </PressableButton>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {!showForm ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto w-full max-w-lg">
            <PressableButton
              type="button"
              variant="button"
              onClick={() => setShowForm(true)}
              className="claim-cta inline-flex w-full items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Eintrag hinzufügen
            </PressableButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
