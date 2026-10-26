"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createManualVehicleEntry } from "@/actions/create-manual-entry";
import { updateManualVehicleEntry } from "@/actions/update-manual-entry";
import { EditableLineItemsSection } from "@/components/documents/editable-line-items-section";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { ListSearchControls } from "@/components/documents/list-search-controls";
import { ManualEntryList } from "@/components/documents/manual-entry-list";
import {
  MANUAL_ENTRY_CONTROL_CLASS,
  ManualEntryBuildStoryCard,
  ManualEntryCategoryCard,
  ManualEntryFieldRow,
  ManualEntryFormActions,
  ManualEntryPhotosCard,
  ManualEntrySwitchRow,
} from "@/components/documents/manual-entry-form-sections";
import { MileageKmInput } from "@/components/documents/mileage-km-input";
import { GarageInsetInput, GarageInsetTextarea } from "@/components/ui/garage-field";
import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import { InsetGroupedCard, IOSListPage } from "@/components/ui/ios";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { useDocumentCompression } from "@/hooks/useDocumentCompression";
import { displayDocumentTitle, parseMileageKmInput } from "@/lib/documents/format";
import { matchesSearchQuery } from "@/lib/documents/list-search";
import {
  filterManualVehicleEntries,
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
import { cn } from "@/lib/utils";
import { formatCurrencyEUR } from "@/utils/formatters";
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

function entryCountLabel(count: number): string {
  return count === 1 ? "1 Eintrag" : `${count} Einträge`;
}

function listSubtitle(entries: Document[]): string {
  const total = entries.reduce((sum, doc) => sum + (doc.amount ?? 0), 0);
  const countLabel = entryCountLabel(entries.length);
  return total > 0 ? `${countLabel} · ${formatCurrencyEUR(total)}` : countLabel;
}

function formHeading(isEditing: boolean, isUmbau: boolean): string {
  if (isEditing) return isUmbau ? "Bild bearbeiten" : "Eintrag bearbeiten";
  return isUmbau ? "Neues Bild" : "Neuer Eintrag";
}

function photosHint(isEditing: boolean, isUmbau: boolean): string {
  if (isEditing) {
    return isUmbau
      ? `Bis zu ${UMBAU_ENTRY_MAX_PHOTOS} neue Bilder.`
      : "Neu hinzufügen oder ersetzen.";
  }
  return isUmbau
    ? `Mindestens 1, max. ${UMBAU_ENTRY_MAX_PHOTOS} Bilder.`
    : `Optional, max. ${MANUAL_ENTRY_MAX_PHOTOS} Bilder.`;
}

function submitLabel(busy: boolean, isEditing: boolean, isUmbau: boolean): string {
  if (busy) return "Speichern…";
  if (isEditing) return "Änderungen speichern";
  return isUmbau ? "Fotos speichern" : "Eintrag speichern";
}

const ALERT_CLASS = "rounded-xl bg-red-500/15 px-4 py-3 text-[15px] text-red-400";

export function ManualEntryView({
  tagUuid,
  vehicleId,
  documents,
  initialListFilter = "all",
  heading = "Umbauten",
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
  const alertMessage = error || compressError;

  const scanHref = `${vehicleSurfaceHref(surfaceScope, "?scan=1&type=invoice")}`;

  const scanFab = showForm ? null : (
    <DashboardScanFab
      tagUuid={tagUuid}
      directAction="menu"
      menuTitle={isUmbau ? "Umbau hinzufügen" : "Eintrag hinzufügen"}
      hideFuelAction
      scanHref={scanHref}
      scanActionLabel="Rechnung scannen"
      onManualEntry={() => setShowForm(true)}
      manualActionLabel={isUmbau ? "Umbau mit Foto" : "Manuell eintragen"}
      manualActionDescription={
        isUmbau
          ? "Fotos vom Umbau ohne KI-Scan"
          : "Service, Umbau oder Notiz ohne Scan"
      }
    />
  );

  return (
    <IOSListPage
      title={heading}
      subtitle={showForm ? formHeading(isEditing, isUmbau) : listSubtitle(entries)}
      backHref={vehicleSurfaceHref(surfaceScope)}
      overlay={scanFab}
    >
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

      {alertMessage ? (
        <p role="alert" className={ALERT_CLASS}>
          {alertMessage}
        </p>
      ) : null}

      {showForm ? (
        <form
          aria-label={formHeading(isEditing, isUmbau)}
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (isEditing) {
              handleUpdate();
            } else {
              handleCreate();
            }
          }}
        >
          {!isUmbau ? (
            <ManualEntryCategoryCard value={category} onChange={setCategory} />
          ) : null}

          <InsetGroupedCard header="Details">
            <ManualEntryFieldRow label="Beleg" htmlFor="manual-entry-title">
              <GarageInsetInput
                id="manual-entry-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={MANUAL_ENTRY_CONTROL_CLASS}
                placeholder={
                  isUmbau || category === "tuning"
                    ? "Was war am Auto? Beschreibung (optional)"
                    : "z. B. Ölwechsel selbst gemacht (optional)"
                }
              />
            </ManualEntryFieldRow>
            <ManualEntryFieldRow label="Datum" htmlFor="manual-entry-date">
              <GermanDateInput
                id="manual-entry-date"
                variant="inset"
                value={date || null}
                onChange={(iso) => setDate(iso ?? "")}
                className={cn(MANUAL_ENTRY_CONTROL_CLASS, "tabular-nums")}
              />
            </ManualEntryFieldRow>
            {!isUmbau ? (
              <>
                <ManualEntryFieldRow label="Betrag (€)" htmlFor="manual-entry-amount">
                  <GarageInsetInput
                    id="manual-entry-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className={cn(MANUAL_ENTRY_CONTROL_CLASS, "tabular-nums")}
                    placeholder={lineItems.length > 0 ? "aus Positionen" : "optional"}
                  />
                </ManualEntryFieldRow>
                {!selfMade ? (
                  <ManualEntryFieldRow label="Werkstatt / Quelle" htmlFor="manual-entry-vendor">
                    <GarageInsetInput
                      id="manual-entry-vendor"
                      value={vendor}
                      onChange={(event) => setVendor(event.target.value)}
                      className={MANUAL_ENTRY_CONTROL_CLASS}
                      placeholder="optional"
                    />
                  </ManualEntryFieldRow>
                ) : null}
                <ManualEntrySwitchRow
                  label="Selbstgemacht"
                  checked={selfMade}
                  onCheckedChange={(next) => {
                    setSelfMade(next);
                    if (next) setVendor("");
                  }}
                />
                <ManualEntryFieldRow label="Kilometerstand" htmlFor="manual-entry-km">
                  <MileageKmInput
                    id="manual-entry-km"
                    variant="inset"
                    value={parseMileageKmInput(mileageKm)}
                    onChange={(km) => setMileageKm(km === null ? "" : String(km))}
                    className={MANUAL_ENTRY_CONTROL_CLASS}
                    placeholder="optional"
                  />
                </ManualEntryFieldRow>
              </>
            ) : null}
            <ManualEntryFieldRow label="Notiz" htmlFor="manual-entry-notes">
              <GarageInsetTextarea
                id="manual-entry-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className={cn(MANUAL_ENTRY_CONTROL_CLASS, "resize-none")}
                placeholder={isUmbau ? "Optional — was zeigt das Foto?" : "Was wurde gemacht?"}
              />
            </ManualEntryFieldRow>
          </InsetGroupedCard>

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

          <ManualEntryPhotosCard
            hint={photosHint(isEditing, isUmbau)}
            statusLabel={statusLabel}
            isUmbau={isUmbau}
            existingPhoto={
              isEditing && existingPhotoUrl
                ? { url: existingPhotoUrl, isImage: Boolean(existingPhotoIsImage) }
                : null
            }
            photos={photos}
            canAddMore={photos.length < photoLimit}
            busy={busy}
            onAddFiles={(files) => void addPhotoFiles(files)}
            onRemovePhoto={removePhoto}
          />

          {canOfferBuildStory && hasPhotoForBuildStory ? (
            <ManualEntryBuildStoryCard
              checked={showOnBuildStory}
              disabled={busy}
              onCheckedChange={setShowOnBuildStory}
            />
          ) : null}

          <ManualEntryFormActions
            submitLabel={submitLabel(busy, isEditing, isUmbau)}
            submitDisabled={busy || (!isEditing && isUmbau && photos.length === 0)}
            cancelDisabled={busy}
            onCancel={closeForm}
          />
        </form>
      ) : null}

      <ManualEntryList
        tagUuid={tagUuid}
        surfaceScope={surfaceScope}
        isUmbau={isUmbau}
        totalCount={entries.length}
        entries={visibleEntries}
        emptyTitle={emptyCopy.title}
        emptyBody={emptyCopy.body}
      />
    </IOSListPage>
  );
}

