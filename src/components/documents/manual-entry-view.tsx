"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  NotebookPen,
  Plus,
  Wrench,
  X,
} from "lucide-react";

import { createManualVehicleEntry } from "@/actions/create-manual-entry";
import { updateManualVehicleEntry } from "@/actions/update-manual-entry";
import { EditableLineItemsSection } from "@/components/documents/editable-line-items-section";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { parseMileageKmInput } from "@/lib/documents/format";
import { ListSearchControls } from "@/components/documents/list-search-controls";
import { FixedBottomActionBar } from "@/components/vehicle-dashboard/fixed-bottom-action-bar";
import {
  automotiveBackPillClassName,
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
  AutomotiveSectionLabel,
} from "@/components/ui/automotive";
import {
  GarageField,
  GarageFieldCell,
  GarageFieldRow,
  GarageInsetInput,
  GarageInsetTextarea,
} from "@/components/ui/garage-field";
import { AutomotiveFeatureTitlePanel } from "@/components/ui/automotive";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import {
  displayDocumentTitle,
  formatDocumentAmount,
  formatDocumentDate,
  formatDocumentDateCompact,
} from "@/lib/documents/format";
import { documentDetailHref } from "@/lib/vehicle-surface/documents-list-href";
import { matchesSearchQuery } from "@/lib/documents/list-search";
import {
  filterManualVehicleEntries,
  MANUAL_ENTRY_CATEGORIES,
  MANUAL_ENTRY_CATEGORY_LABELS,
  MANUAL_ENTRY_MAX_PHOTOS,
  UMBAU_ENTRY_MAX_PHOTOS,
  manualEntryPhotoLimit,
  parseManualEntryCategory,
  resolveManualEntryTitle,
  type ManualEntryCategory,
} from "@/lib/documents/manual-entries";
import {
  documentMediaKind,
  inlineDocumentProxyUrl,
  isViewableDocumentUrl,
} from "@/lib/documents/viewable-url";
import {
  isOilChangeSelfMadeVendor,
  resolveOilChangeVendor,
} from "@/lib/documents/oil-changes";
import {
  vehicleSurfaceHref,
  vehicleSurfaceScopeFromContext,
} from "@/lib/vehicle-surface/paths";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { convertImagesToPdf } from "@/lib/utils/pdf-converter";
import type { Document, DocumentLineItem } from "@/types/database";

export type ManualListFilter = "all" | ManualEntryCategory | "photos";

type ManualEntryVariant = "default" | "umbau";

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
  /**
   * `umbau` = photo-first Umbau-Bilder surface (tuning only, photo required).
   */
  variant?: ManualEntryVariant;
}

type PhotoDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

async function attachEntryPhotosToFormData(
  formData: FormData,
  photoDrafts: PhotoDraft[],
): Promise<void> {
  if (photoDrafts.length === 0) return;
  if (photoDrafts.length === 1) {
    formData.set("photo", photoDrafts[0].file, photoDrafts[0].file.name);
    return;
  }
  const pdf = await convertImagesToPdf(
    photoDrafts.map((entry) => entry.file),
    {
      fileName: "fotodoku",
      fullBleed: true,
    },
  );
  formData.set("photo", pdf.file, pdf.file.name);
  formData.set("pageCount", String(pdf.pageCount));
}

const MANUAL_ENTRY_FIELD_LABEL =
  "text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]";
const MANUAL_ENTRY_CATEGORY_BTN =
  "flex min-h-[var(--claim-field-min-height)] items-center rounded-[var(--vd-radius-field)] border px-3 text-left text-[0.85rem] font-semibold";
export function ManualEntryView({
  tagUuid,
  vehicleId,
  vehicleLabel,
  documents,
  initialListFilter = "all",
  heading = "Umbauten",
  subheading = "Umbauten, Wartung & Fotos",
  variant = "default",
}: ManualEntryViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openFormOnLoad = searchParams.get("neu") === "1";
  const editDocumentId = searchParams.get("edit");
  const focusPhotos = searchParams.get("photos") === "1";
  const isUmbau = variant === "umbau";
  const { compressFile, isCompressing, statusLabel, error: compressError } =
    useDocumentCompression();
  const [showForm, setShowForm] = useState(openFormOnLoad || Boolean(editDocumentId));
  const [category, setCategory] = useState<ManualEntryCategory>(
    isUmbau
      ? "tuning"
      : initialListFilter === "tuning" || initialListFilter === "service"
        ? initialListFilter
        : "service",
  );
  const [listFilter, setListFilter] = useState<ManualListFilter>(
    isUmbau ? "all" : initialListFilter,
  );
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [selfMade, setSelfMade] = useState(false);
  const [mileageKm, setMileageKm] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<DocumentLineItem[]>([]);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [showOnBuildStory, setShowOnBuildStory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const surfaceScope = useMemo(
    () => vehicleSurfaceScopeFromContext(tagUuid, vehicleId),
    [tagUuid, vehicleId],
  );

  const entries = useMemo(() => {
    const all = filterManualVehicleEntries(documents);
    if (!isUmbau) return all;
    // Umbau-Bilder: nur Tuning-Fotos — keine Rechnungs-/Texteinträge ohne Bild.
    return all.filter(
      (doc) =>
        doc.category === "tuning" &&
        isViewableDocumentUrl(doc.file_url) &&
        documentMediaKind(doc.file_url) === "image",
    );
  }, [documents, isUmbau]);

  const editingDocument = useMemo(() => {
    if (!editDocumentId) return null;
    return entries.find((doc) => doc.id === editDocumentId) ?? null;
  }, [entries, editDocumentId]);

  const isEditing = Boolean(editingDocument);
  const photoLimit = isUmbau
    ? UMBAU_ENTRY_MAX_PHOTOS
    : manualEntryPhotoLimit(category);

  const existingPhotoUrl =
    editingDocument && isViewableDocumentUrl(editingDocument.file_url)
      ? inlineDocumentProxyUrl(editingDocument.file_url)
      : null;
  const existingPhotoIsImage =
    Boolean(existingPhotoUrl) &&
    editingDocument &&
    documentMediaKind(editingDocument.file_url) === "image";

  const canOfferBuildStory =
    isUmbau || category === "tuning";
  const hasPhotoForBuildStory =
    photos.length > 0 || Boolean(existingPhotoIsImage);

  const listChips = useMemo(() => {
    const withPhoto = entries.filter((doc) =>
      isViewableDocumentUrl(doc.file_url),
    ).length;
    if (isUmbau) {
      return [
        { id: "all", label: "Alle", count: entries.length },
        { id: "photos", label: "Mit Foto", count: withPhoto },
      ];
    }
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
  }, [entries, isUmbau]);

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

  const emptyCopy = isUmbau
    ? {
        title: "Noch keine Umbau-Bilder",
        body: "Fotografiere Felgen, Fahrwerk, Aerodynamik oder andere Umbauten — so bleibt die Historie nachvollziehbar.",
        cta: "Umbau mit Foto hinzufügen",
      }
    : {
        title: "Noch keine manuellen Einträge",
        body: "Trage Wartungen oder Tuning-Arbeiten ein und dokumentiere sie optional mit Fotos.",
        cta: "Eintrag hinzufügen",
      };

  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
    // Only revoke on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, []);

  useEffect(() => {
    if (!editingDocument) return;
    setShowForm(true);
    setCategory(parseManualEntryCategory(editingDocument.category) ?? "service");
    setTitle(displayDocumentTitle(editingDocument.title));
    setDate(editingDocument.date ?? "");
    setAmount(
      editingDocument.amount != null
        ? editingDocument.amount.toFixed(2).replace(".", ",")
        : "",
    );
    const storedVendor = editingDocument.vendor ?? "";
    setSelfMade(isOilChangeSelfMadeVendor(storedVendor));
    setVendor(
      isOilChangeSelfMadeVendor(storedVendor) ? "" : storedVendor,
    );
    setMileageKm(
      editingDocument.mileage_km != null
        ? String(editingDocument.mileage_km)
        : "",
    );
    setNotes(editingDocument.notes ?? "");
    setLineItems(editingDocument.line_items ?? []);
    setShowOnBuildStory(editingDocument.show_on_build_story === true);
    setPhotos([]);
    setError(null);
  }, [editingDocument]);

  useEffect(() => {
    if (!editDocumentId || editingDocument) return;
    if (entries.length === 0 && documents.length === 0) return;
    setError("Eintrag nicht gefunden oder nicht mehr vorhanden.");
    setShowForm(false);
  }, [editDocumentId, editingDocument, entries.length, documents.length]);

  useEffect(() => {
    if (!focusPhotos || !showForm) return;
    const id = window.requestAnimationFrame(() => {
      document
        .getElementById("manual-entry-photos")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [focusPhotos, showForm, editingDocument?.id]);

  function resetForm() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setTitle("");
    setDate("");
    setAmount("");
    setVendor("");
    setSelfMade(false);
    setMileageKm("");
    setNotes("");
    setLineItems([]);
    setPhotos([]);
    setShowOnBuildStory(false);
    setCategory(isUmbau ? "tuning" : "service");
    setError(null);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
    if (editDocumentId) {
      const scope = vehicleSurfaceScopeFromContext(tagUuid, vehicleId);
      const base = vehicleSurfaceHref(
        scope,
        "umbauten",
      );
      router.replace(base);
    }
  }

  async function addPhotoFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError(null);
    const remaining = photoLimit - photos.length;
    if (remaining <= 0) {
      setError(`Maximal ${photoLimit} Fotos pro Eintrag.`);
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
        setPhotos((prev) => [...prev, ...next].slice(0, photoLimit));
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

  function handleLineItemsChange(items: DocumentLineItem[]) {
    setLineItems(items);
    if (items.length === 0) return;
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    if (total > 0) {
      setAmount(total.toFixed(2).replace(".", ","));
    }
  }

  function appendLineItemsToFormData(formData: FormData) {
    if (lineItems.length > 0) {
      formData.set("lineItems", JSON.stringify(lineItems));
    }
  }

  function vendorForSubmit(): string {
    if (selfMade) {
      return resolveOilChangeVendor(true, "") ?? "";
    }
    return vendor;
  }

  function appendUmbauMetadata(
    formData: FormData,
    baseTitle: string,
  ) {
    formData.set("category", "tuning");
    formData.set("title", baseTitle);
    formData.set("date", date);
    formData.set("notes", notes);
    formData.set("amount", "");
    formData.set("vendor", "");
    formData.set("mileageKm", "");
  }

  function appendBuildStoryOptIn(formData: FormData) {
    const enabled =
      canOfferBuildStory &&
      hasPhotoForBuildStory &&
      showOnBuildStory;
    formData.set("showOnBuildStory", enabled ? "true" : "false");
  }

  function handleUpdate() {
    if (!editingDocument) return;
    setError(null);
    startTransition(async () => {
      try {
        const baseTitle = resolveManualEntryTitle(title, category, {
          umbau: isUmbau,
        });
        const formData = new FormData();
        formData.set("documentId", editingDocument.id);
        formData.set("vehicleId", vehicleId);
        formData.set("tagUuid", tagUuid);
        if (isUmbau) {
          appendUmbauMetadata(formData, baseTitle);
        } else {
          formData.set("category", category);
          formData.set("title", baseTitle);
          formData.set("date", date);
          formData.set("amount", amount);
          formData.set("vendor", vendorForSubmit());
          formData.set("mileageKm", mileageKm);
          formData.set("notes", notes);
          appendLineItemsToFormData(formData);
        }
        appendBuildStoryOptIn(formData);
        await attachEntryPhotosToFormData(formData, photos);

        const result = await updateManualVehicleEntry(formData);
        if (result.status === "error") {
          setError(result.message);
          return;
        }

        showSavedToast();
        closeForm();
        router.refresh();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Eintrag konnte nicht gespeichert werden.",
        );
      }
    });
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        if (isUmbau && photos.length === 0) {
          setError("Bitte mindestens ein Foto vom Umbau hinzufügen.");
          return;
        }

        const baseTitle = resolveManualEntryTitle(title, category, {
          umbau: isUmbau,
        });

        const formData = new FormData();
        formData.set("vehicleId", vehicleId);
        formData.set("tagUuid", tagUuid);
        formData.set("category", category);
        formData.set("title", baseTitle);
        formData.set("date", date);
        formData.set("amount", amount);
        formData.set("vendor", vendorForSubmit());
        formData.set("mileageKm", mileageKm);
        formData.set("notes", notes);
        appendLineItemsToFormData(formData);
        appendBuildStoryOptIn(formData);

        if (isUmbau) {
          appendUmbauMetadata(formData, baseTitle);
        }

        await attachEntryPhotosToFormData(formData, photos);

        const result = await createManualVehicleEntry(formData);
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        showSavedToast();
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
            className={automotiveBackPillClassName}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Dashboard
          </PressableLink>

          <AutomotiveFeatureTitlePanel
            icon={
              isUmbau ? (
                <ImagePlus className="h-5 w-5" aria-hidden />
              ) : (
                <NotebookPen className="h-5 w-5" aria-hidden />
              )
            }
            title={heading}
          />
        </header>

        {!showForm ? (
          <ListSearchControls
            query={query}
            onQueryChange={setQuery}
            placeholder={isUmbau ? "Titel, Notiz…" : "Titel, Notiz, Werkstatt…"}
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
            className="space-y-3 zt-feature-panel p-4 shadow-[var(--vd-shadow-sm)]"
            onSubmit={(event) => {
              event.preventDefault();
              if (isEditing) {
                handleUpdate();
              } else {
                handleCreate();
              }
            }}
          >
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
              {isEditing
                ? isUmbau
                  ? "Bild bearbeiten"
                  : "Eintrag bearbeiten"
                : isUmbau
                  ? "Neues Bild"
                  : "Neuer Eintrag"}
            </p>
            {!isUmbau ? (
              <>
                <p className={MANUAL_ENTRY_FIELD_LABEL}>Art</p>
                <div className="grid grid-cols-2 gap-3">
                  {MANUAL_ENTRY_CATEGORIES.map((id) => (
                    <PressableButton
                      key={id}
                      type="button"
                      variant="button"
                      onClick={() => setCategory(id)}
                      className={`${MANUAL_ENTRY_CATEGORY_BTN} ${
                        category === id
                          ? "border-neutral-900 bg-white text-neutral-900 shadow-[var(--vd-shadow-sm)]"
                          : "border-[color:var(--vd-border)] bg-transparent text-[color:var(--vd-muted)]"
                      }`}
                    >
                      {MANUAL_ENTRY_CATEGORY_LABELS[id]}
                    </PressableButton>
                  ))}
                </div>
              </>
            ) : null}

            <GarageField label="Beleg" htmlFor="manual-entry-title">
              <GarageInsetInput
                id="manual-entry-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  isUmbau || category === "tuning"
                    ? "Was war am Auto? Beschreibung (optional)"
                    : "z. B. Ölwechsel selbst gemacht (optional)"
                }
              />
            </GarageField>

            {isUmbau ? (
              <GarageField label="Datum" htmlFor="manual-entry-date">
                <GermanDateInput
                  id="manual-entry-date"
                  variant="inset"
                  value={date || null}
                  onChange={(iso) => setDate(iso ?? "")}
                />
              </GarageField>
            ) : (
              <GarageFieldRow>
                <GarageFieldCell label="Datum" htmlFor="manual-entry-date">
                  <GermanDateInput
                    id="manual-entry-date"
                    variant="inset"
                    value={date || null}
                    onChange={(iso) => setDate(iso ?? "")}
                  />
                </GarageFieldCell>
                <GarageFieldCell label="Betrag (€)" htmlFor="manual-entry-amount">
                  <GarageInsetInput
                    id="manual-entry-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder={
                      lineItems.length > 0 ? "aus Positionen" : "optional"
                    }
                  />
                </GarageFieldCell>
              </GarageFieldRow>
            )}

            {!isUmbau ? (
              <>
                <div className="space-y-2">
                  {!selfMade ? (
                    <GarageField
                      label="Werkstatt / Quelle"
                      htmlFor="manual-entry-vendor"
                    >
                      <GarageInsetInput
                        id="manual-entry-vendor"
                        value={vendor}
                        onChange={(event) => setVendor(event.target.value)}
                        placeholder="optional"
                      />
                    </GarageField>
                  ) : null}
                  <PressableButton
                    type="button"
                    variant="button"
                    aria-pressed={selfMade}
                    onClick={() => {
                      setSelfMade((active) => {
                        const next = !active;
                        if (next) setVendor("");
                        return next;
                      });
                    }}
                    className={`${MANUAL_ENTRY_CATEGORY_BTN} w-full justify-center ${
                      selfMade
                        ? "border-neutral-900 bg-white text-neutral-900 shadow-[var(--vd-shadow-sm)]"
                        : "border-[color:var(--vd-border)] bg-transparent text-[color:var(--vd-muted)]"
                    }`}
                  >
                    Selbstgemacht
                  </PressableButton>
                </div>

                <GarageField label="Kilometerstand" htmlFor="manual-entry-km">
                  <MileageKmInput
                    id="manual-entry-km"
                    variant="inset"
                    value={parseMileageKmInput(mileageKm)}
                    onChange={(km) => setMileageKm(km === null ? "" : String(km))}
                    placeholder="optional"
                  />
                </GarageField>
              </>
            ) : null}

            {!isUmbau ? (
              <EditableLineItemsSection
                items={lineItems}
                onChange={handleLineItemsChange}
                totalAmount={
                  lineItems.length > 0
                    ? lineItems.reduce((sum, item) => sum + item.amount, 0)
                    : null
                }
                emptyHint="Optional — Teile und Kosten wie bei einer Rechnung eintragen."
              />
            ) : null}

            <GarageField label="Notiz" htmlFor="manual-entry-notes">
              <GarageInsetTextarea
                id="manual-entry-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="resize-none"
                placeholder={
                  isUmbau
                    ? "Optional — was zeigt das Foto?"
                    : "Was wurde gemacht?"
                }
              />
            </GarageField>

            <div id="manual-entry-photos" className="scroll-mt-24 space-y-2">
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                Fotos{" "}
                <span className="normal-case tracking-normal text-[color:var(--vd-muted)]">
                  {isEditing
                    ? isUmbau
                      ? `(bis zu ${UMBAU_ENTRY_MAX_PHOTOS} neue Bilder)`
                      : "(neu hinzufügen oder ersetzen)"
                    : isUmbau
                      ? `(mindestens 1, max. ${UMBAU_ENTRY_MAX_PHOTOS})`
                      : `(optional, max. ${MANUAL_ENTRY_MAX_PHOTOS})`}
                </span>
              </p>

              {isEditing && existingPhotoUrl ? (
                <div className="relative aspect-video overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-neutral-100">
                  {existingPhotoIsImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={existingPhotoUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : isUmbau ? (
                    <p className="flex h-full min-h-[12rem] items-center justify-center px-4 text-center text-[0.82rem] text-[color:var(--vd-muted)]">
                      Nur Bilder werden hier angezeigt.
                    </p>
                  ) : (
                    <iframe
                      title="Vorhandenes Dokument"
                      src={existingPhotoUrl}
                      className="h-full min-h-[12rem] w-full"
                    />
                  )}
                </div>
              ) : null}

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

              {photos.length < photoLimit ? (
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

            {canOfferBuildStory && hasPhotoForBuildStory ? (
              <label
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-4 py-3"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[color:var(--vd-border)] accent-[color:var(--vd-accent)]"
                  checked={showOnBuildStory}
                  disabled={busy}
                  onChange={(event) =>
                    setShowOnBuildStory(event.target.checked)
                  }
                />
                <span className="min-w-0 space-y-1">
                  <span className="block text-[0.88rem] font-medium text-[color:var(--vd-text)]">
                    In der Build-Story zeigen
                  </span>
                  <span className="block text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
                    Sichtbar für Besucher nur wenn die Build-Story im Profil
                    öffentlich ist. Deine Auswahl wird mit dem Eintrag
                    gespeichert.
                  </span>
                </span>
              </label>
            ) : null}

            <div className="flex flex-col gap-2 pt-1">
              <PressableButton
                type="submit"
                variant="button"
                disabled={
                  busy ||
                  (!isEditing && isUmbau && photos.length === 0)
                }
                className="claim-cta w-full disabled:opacity-60"
              >
                {busy
                  ? "Speichern…"
                  : isEditing
                    ? "Änderungen speichern"
                    : isUmbau
                      ? "Fotos speichern"
                      : "Eintrag speichern"}
              </PressableButton>
              <PressableButton
                type="button"
                variant="button"
                disabled={busy}
                onClick={closeForm}
                className="claim-back w-full"
              >
                Abbrechen
              </PressableButton>
            </div>
          </form>
        ) : null}

        <section
          aria-label={isUmbau ? "Umbau-Bilder" : "Manuelle Einträge"}
          className="space-y-2"
        >
          <AutomotiveSectionLabel>
            {isUmbau ? "Umbau-Bilder" : "Einträge"}
          </AutomotiveSectionLabel>

          {entries.length === 0 ? (
            <AutomotiveEmptyPanel>
              {emptyCopy.title}. {emptyCopy.body}
            </AutomotiveEmptyPanel>
          ) : visibleEntries.length === 0 ? (
            <AutomotiveEmptyPanel>
              Keine Treffer für diese Suche / Filter.
            </AutomotiveEmptyPanel>
          ) : (
            <AutomotiveList aria-label="Umbauten und Einträge">
              {visibleEntries.map((doc, index) => {
                const kind =
                  doc.category === "tuning"
                    ? MANUAL_ENTRY_CATEGORY_LABELS.tuning
                    : MANUAL_ENTRY_CATEGORY_LABELS.service;
                const amount =
                  typeof doc.amount === "number"
                    ? formatDocumentAmount(doc.amount)
                    : null;
                const vendor = doc.vendor?.trim() || kind;
                const issued = formatDocumentDateCompact(doc.date);
                const hasPhoto = isViewableDocumentUrl(doc.file_url);
                const RowIcon = doc.category === "tuning" ? Wrench : NotebookPen;

                return (
                  <AutomotiveListRow
                    key={doc.id}
                    href={documentDetailHref(tagUuid, doc.id, surfaceScope)}
                    icon={RowIcon}
                    title={displayDocumentTitle(doc.title)}
                    amount={amount ?? undefined}
                    meta={`${vendor} · ${issued} · ${kind}`}
                    badge={
                      hasPhoto ? (
                        <span className="inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-400">
                          Foto
                        </span>
                      ) : undefined
                    }
                    showDivider={index < visibleEntries.length - 1}
                  />
                );
              })}
            </AutomotiveList>
          )}
        </section>
      </div>

      {!showForm ? (
        <FixedBottomActionBar>
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setShowForm(true)}
            className="claim-cta inline-flex w-full items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {emptyCopy.cta}
          </PressableButton>
        </FixedBottomActionBar>
      ) : null}
    </div>
  );
}
