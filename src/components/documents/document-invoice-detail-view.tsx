"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ImagePlus, Trash2 } from "lucide-react";

import { deleteDocument } from "@/actions/delete-document";
import { showSavedToast } from "@/lib/ui/saved-toast";

import { ApprovalFieldsSection } from "@/components/documents/approval-fields-section";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { EditableTuevHuSection } from "@/components/documents/editable-tuev-hu-section";
import { EditableTuevDefectsSection } from "@/components/documents/editable-tuev-defects-section";
import { EditableTitleSection } from "@/components/documents/editable-title-section";
import { EditableDocumentAmountSection } from "@/components/documents/editable-document-amount-section";
import { EditableDocumentDateSection } from "@/components/documents/editable-document-date-section";
import { EditableDocumentMileageSection } from "@/components/documents/editable-document-mileage-section";
import { EditableDocumentNotesSection } from "@/components/documents/editable-document-notes-section";
import { EditableVendorSection } from "@/components/documents/editable-vendor-section";
import { EditableInvoiceCategorySection } from "@/components/documents/editable-invoice-category-section";
import { displayInvoiceReviewCategoryLabel } from "@/lib/documents/invoice-review-categories";
import { EditableLineItemsSection } from "@/components/documents/editable-line-items-section";
import { InvoiceAddPhotosSheet } from "@/components/documents/invoice-add-photos-sheet";
import { InvoiceDetailEditPickerSheet } from "@/components/documents/invoice-detail-edit-picker-sheet";
import { DocumentOriginalPreview } from "@/components/documents/document-original-preview";
import {
  ReceiptActionBar,
  ReceiptHero,
  ReceiptLineItemsCard,
  ReceiptMetadataCard,
  type ReceiptMetadataField,
} from "@/components/documents/receipt";
import { TuevDefectsSection } from "@/components/documents/tuev-defects-section";
import {
  IOS_CARD,
  IOS_PILL,
  IOSScreen,
  InsetGroupedCard,
  InsetListRow,
} from "@/components/ui/ios";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import {
  displayDocumentTitle,
  formatMileageKmLabel,
  formatDocumentDateCompact,
} from "@/lib/documents/format";
import { documentAppendPhotoLimit } from "@/lib/documents/document-page-limits";
import {
  displayManualInvoiceNumber,
  isManualVehicleEntry,
  manualEntryEditPath,
} from "@/lib/documents/manual-entries";
import {
  documentMediaKind,
  isViewableDocumentUrl,
  resolveDocumentViewUrl,
} from "@/lib/documents/viewable-url";
import { cn } from "@/lib/utils";
import { formatDateDE, restoreGermanUmlauts } from "@/utils/formatters";
import { vehicleSurfaceScopeFromContext } from "@/lib/vehicle-surface/paths";
import {
  documentDeleteButtonLabel,
  documentDeleteConfirmMessage,
} from "@/lib/documents/constants";
import { resolveDocumentMileageKm } from "@/lib/documents/document-mileage";
import { resolveInvoicePaymentBadge } from "@/lib/documents/payment-status";
import {
  INVOICE_DETAIL_EDIT_ANCHORS,
  scrollToInvoiceEditTarget,
  type InvoiceDetailEditTarget,
} from "@/lib/documents/invoice-detail-edit";
import type { Document } from "@/types/database";

interface DocumentInvoiceDetailViewProps {
  tagUuid: string;
  vehicleLabel: string;
  document: Document;
  backHref?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

const UUID_FILE_STEM =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fileNameFromUrl(fileUrl: string, fallback: string): string {
  try {
    const path = fileUrl.split("?")[0] ?? fileUrl;
    const name = path.split("/").pop();
    if (name && name.includes(".")) {
      const decoded = decodeURIComponent(name);
      const stem = decoded.replace(/\.[^.]+$/, "");
      if (UUID_FILE_STEM.test(stem)) {
        return fallback;
      }
      return decoded;
    }
  } catch {
    // ignore
  }
  return `${fallback.replace(/\s+/g, "_")}.pdf`;
}

function fotodokuSectionTitle(
  isManual: boolean,
  title: string,
  fileName: string,
): string {
  if (isManual) {
    return title.trim() || "Fotodoku";
  }
  return fileName;
}

/**
 * Structured invoice detail (metadata + line items + inline original PDF).
 */
export function DocumentInvoiceDetailView({
  tagUuid,
  vehicleLabel: _vehicleLabel,
  document,
  backHref,
  canEdit = false,
  canDelete = false,
}: DocumentInvoiceDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [vendorLabel, setVendorLabel] = useState(
    () => document.vendor?.trim() || displayDocumentTitle(document.title),
  );
  const [title, setTitle] = useState(() => displayDocumentTitle(document.title));
  const [documentDate, setDocumentDate] = useState(() => document.date);
  const [documentAmount, setDocumentAmount] = useState(() => document.amount);
  const [documentNotes, setDocumentNotes] = useState(() => document.notes);
  const [mileageKm, setMileageKm] = useState(() =>
    resolveDocumentMileageKm(document),
  );
  const [documentCategory, setDocumentCategory] = useState(
    () => document.category,
  );
  const [editPickerOpen, setEditPickerOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<InvoiceDetailEditTarget | null>(
    null,
  );
  const [editPulse, setEditPulse] = useState(0);
  const [addPhotosOpen, setAddPhotosOpen] = useState(false);
  const [showSavedPhotoHint, setShowSavedPhotoHint] = useState(false);
  const lineItems = document.line_items ?? [];
  const isManual = isManualVehicleEntry(document);
  const isUmbauManual =
    isManual &&
    (document.category === "tuning" ||
      /tuning|umbau/i.test(document.category?.trim() ?? ""));
  const surfaceScope = vehicleSurfaceScopeFromContext(
    tagUuid,
    document.vehicle_id,
  );
  const currentPageCount =
    document.page_count != null && document.page_count > 0
      ? document.page_count
      : isViewableDocumentUrl(document.file_url)
        ? 1
        : 0;
  const canAddPhotos =
    canEdit &&
    document.type === "invoice" &&
    Boolean(document.vehicle_id) &&
    !isUmbauManual &&
    documentAppendPhotoLimit(currentPageCount) > 0;
  const manualAddPhotosHref =
    isUmbauManual && canEdit
      ? manualEntryEditPath(surfaceScope, document.id, document.category, {
          focusPhotos: true,
        })
      : null;

  useEffect(() => {
    if (searchParams.get("saved") === "1" && canAddPhotos) {
      setShowSavedPhotoHint(true);
    }
  }, [searchParams, canAddPhotos]);
  const paymentBadge = resolveInvoicePaymentBadge(document);
  const canEditInvoice =
    canEdit && document.type === "invoice" && Boolean(document.vehicle_id);
  const useCentralEdit = canEditInvoice;
  const canEditPositions = canEditInvoice;
  const canDeleteInvoice =
    canDelete &&
    Boolean(document.vehicle_id) &&
    (document.file_url.startsWith("mock://") ||
      !document.file_url.startsWith("/demo/"));
  const resolvedBack =
    backHref ?? `/v/${tagUuid}/dokumente?type=${document.type}`;
  const deleteDocumentType =
    document.type === "tuev" || document.approval_fields?.kind === "tuev"
      ? "tuev"
      : document.type;

  function handleDeleteInvoice() {
    if (!canDeleteInvoice) return;
    const confirmed = window.confirm(
      documentDeleteConfirmMessage(deleteDocumentType, title),
    );
    if (!confirmed) return;

    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteDocument({
        documentId: document.id,
        vehicleId: document.vehicle_id,
        tagUuid,
      });
      if (result.status === "error") {
        setDeleteError(result.message);
        return;
      }
      showSavedToast();
      router.push(resolvedBack);
      router.refresh();
    });
  }
  const fileName = fileNameFromUrl(document.file_url, title);
  const fotodokuTitle = fotodokuSectionTitle(isManual, title, fileName);
  const issuedLabel = formatDocumentDateCompact(documentDate);
  const scannedLabel = formatDocumentDateCompact(document.created_at);
  const pageMetaLabel = [
    document.page_count && document.page_count > 1
      ? `${document.page_count} Seiten`
      : null,
    scannedLabel ? `${isManual ? "Erstellt" : "Gescannt"} ${scannedLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const mileageLabel =
    mileageKm !== null ? formatMileageKmLabel(mileageKm) : null;
  const vendor = vendorLabel.trim() || title;
  const categoryLabel = displayInvoiceReviewCategoryLabel(
    documentCategory?.trim() || document.category,
  );
  const invoiceNumberLabel = displayManualInvoiceNumber(document.invoice_number);
  const showBelegnr = Boolean(invoiceNumberLabel);
  const showMileageEditable = isManual && canEditInvoice;
  const showMileageReadOnly = !showMileageEditable && Boolean(mileageLabel);

  const tuevApprovalFields =
    document.approval_fields?.kind === "tuev"
      ? document.approval_fields
      : null;
  const isTuevDocument =
    document.type === "tuev" || Boolean(tuevApprovalFields);

  const handleEditRequestConsumed = useCallback(() => {
    setEditRequest(null);
  }, []);

  function handleEditPick(target: InvoiceDetailEditTarget) {
    setEditPickerOpen(false);
    requestAnimationFrame(() => {
      scrollToInvoiceEditTarget(target);
      setEditRequest(target);
      setEditPulse((pulse) => pulse + 1);
    });
  }

  const openCentralEdit = useCallback(() => {
    setEditPickerOpen(true);
  }, []);

  const openManualEdit = useCallback(() => {
    router.push(
      manualEntryEditPath(surfaceScope, document.id, document.category),
    );
  }, [document.category, document.id, router, surfaceScope]);

  const showNavEdit = useCentralEdit || (canEdit && isManual);
  const handleNavEdit = useCentralEdit
    ? openCentralEdit
    : canEdit && isManual
      ? openManualEdit
      : undefined;

  async function handleShare() {
    const shareUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const payload = {
      title,
      text: [vendor, invoiceNumberLabel, issuedLabel]
        .filter(Boolean)
        .join(" · "),
      url: shareUrl || undefined,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        return;
      }
      if (payload.url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.url);
      }
    } catch {
      // User cancelled share sheet — ignore.
    }
  }

  const originalHref = isViewableDocumentUrl(document.file_url)
    ? resolveDocumentViewUrl(document.file_url)
    : null;
  const originalLabel = isManual
    ? "Fotos ansehen"
    : documentMediaKind(document.file_url) === "pdf"
      ? "Original-PDF öffnen"
      : "Original-Beleg öffnen";
  const showCategory = !isTuevDocument && document.type === "invoice";

  const editRowProps = {
    documentId: document.id,
    vehicleId: document.vehicle_id,
    tagUuid,
    hideEditTrigger: useCentralEdit,
    editRequest,
    editPulse,
    onEditRequestConsumed: handleEditRequestConsumed,
    layout: "inset-row",
  } as const;

  const editableRows: Partial<Record<ReceiptMetadataField, ReactNode>> =
    canEditInvoice
      ? {
          vendor: (
            <EditableVendorSection
              {...editRowProps}
              vendor={document.vendor}
              label={isManual ? "Ausführender" : "Werkstatt"}
              placeholder={
                isManual ? "z. B. selbst, Werkstatt Name" : "z. B. Auto Meister GmbH"
              }
              onSaved={(nextVendor) => setVendorLabel(nextVendor?.trim() || title)}
              sectionId={INVOICE_DETAIL_EDIT_ANCHORS.vendor}
            />
          ),
          category: showCategory ? (
            <EditableInvoiceCategorySection
              {...editRowProps}
              category={documentCategory}
              onSaved={setDocumentCategory}
              sectionId={INVOICE_DETAIL_EDIT_ANCHORS.category}
            />
          ) : undefined,
          date: (
            <EditableDocumentDateSection
              {...editRowProps}
              date={documentDate}
              onSaved={setDocumentDate}
              sectionId={INVOICE_DETAIL_EDIT_ANCHORS.date}
            />
          ),
          mileage: showMileageEditable ? (
            <EditableDocumentMileageSection
              {...editRowProps}
              label="Kilometerstand"
              mileageKm={mileageKm}
              onSaved={setMileageKm}
              sectionId={INVOICE_DETAIL_EDIT_ANCHORS.mileage}
            />
          ) : undefined,
          amount: isManual ? (
            <EditableDocumentAmountSection
              {...editRowProps}
              amount={documentAmount}
              onSaved={setDocumentAmount}
              sectionId={INVOICE_DETAIL_EDIT_ANCHORS.amount}
            />
          ) : undefined,
        }
      : {};

  return (
    <IOSScreen>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-32 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <PressableLink
            href={resolvedBack}
            variant="pill"
            className="-ml-1 inline-flex w-fit min-w-0 items-center gap-0.5 py-1 text-[17px] text-[#0A84FF]"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            Belege
          </PressableLink>
          {showNavEdit && handleNavEdit ? (
            <PressableButton
              type="button"
              variant="button"
              onClick={handleNavEdit}
              className="shrink-0 py-1 text-[17px] font-semibold text-[#0A84FF]"
            >
              Bearbeiten
            </PressableButton>
          ) : null}
        </div>

        <ReceiptHero
          title={
            canEditInvoice ? (
              <EditableTitleSection
                {...editRowProps}
                layout="default"
                title={title}
                onSaved={setTitle}
                sectionId={INVOICE_DETAIL_EDIT_ANCHORS.title}
              />
            ) : (
              title
            )
          }
          amount={documentAmount}
          categoryLabel={showCategory ? categoryLabel : isTuevDocument ? "TÜV" : null}
          vendor={document.type === "invoice" ? vendor : null}
          dateLabel={formatDateDE(documentDate)}
          status={
            paymentBadge ? (
              <span className={cn(IOS_PILL, "bg-emerald-500/15 text-emerald-400")}>
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                {paymentBadge}
              </span>
            ) : undefined
          }
        />

        <ApprovalFieldsSection
          approvalFields={document.approval_fields}
          hideNextHu={canEdit && isTuevDocument}
          hideDefects={isTuevDocument}
        />

        {canEdit && tuevApprovalFields ? (
          <EditableTuevHuSection
            approvalFields={tuevApprovalFields}
            documentId={document.id}
            vehicleId={document.vehicle_id}
            tagUuid={tagUuid}
          />
        ) : null}

        <ReceiptMetadataCard
          metadata={{
            vendor: document.type === "invoice" ? vendor : null,
            vendorLabel: isManual ? "Ausführender" : "Werkstatt",
            category: showCategory ? categoryLabel : null,
            date: documentDate,
            mileageKm: showMileageReadOnly || showMileageEditable ? mileageKm : null,
            invoiceNumber: showBelegnr ? invoiceNumberLabel : null,
          }}
          editableRows={editableRows}
        />

        {canEdit && tuevApprovalFields ? (
          <EditableTuevDefectsSection
            approvalFields={tuevApprovalFields}
            documentId={document.id}
            vehicleId={document.vehicle_id}
            tagUuid={tagUuid}
          />
        ) : isTuevDocument ? (
          <TuevDefectsSection
            data={
              tuevApprovalFields?.data ?? {
                defectsTable: null,
                defectsList: null,
              }
            }
          />
        ) : null}

        {!isTuevDocument && canEditPositions ? (
          <EditableLineItemsSection
            items={lineItems}
            documentId={document.id}
            vehicleId={document.vehicle_id}
            tagUuid={tagUuid}
            totalAmount={documentAmount}
            hideEditTrigger={useCentralEdit}
            editRequest={editRequest}
            editPulse={editPulse}
            onEditRequestConsumed={handleEditRequestConsumed}
            sectionId={INVOICE_DETAIL_EDIT_ANCHORS.lineItems}
            shellClassName={cn(IOS_CARD, "p-4")}
            renderReadView={(items) => (
              <ReceiptLineItemsCard items={items} total={documentAmount} />
            )}
          />
        ) : !isTuevDocument && lineItems.length > 0 ? (
          <ReceiptLineItemsCard items={lineItems} total={documentAmount} />
        ) : null}

        {isManual && canEditInvoice ? (
          <EditableDocumentNotesSection
            documentId={document.id}
            vehicleId={document.vehicle_id}
            tagUuid={tagUuid}
            notes={documentNotes}
            onSaved={setDocumentNotes}
            hideEditTrigger={useCentralEdit}
            editRequest={editRequest}
            editPulse={editPulse}
            onEditRequestConsumed={handleEditRequestConsumed}
            sectionId={INVOICE_DETAIL_EDIT_ANCHORS.notes}
          />
        ) : isManual && documentNotes?.trim() ? (
          <InsetGroupedCard header="Notizen">
            <p className="whitespace-pre-line px-4 py-3 text-[15px] leading-snug text-white">
              {restoreGermanUmlauts(documentNotes.trim())}
            </p>
          </InsetGroupedCard>
        ) : null}

        {showSavedPhotoHint && canAddPhotos ? (
          <InsetGroupedCard header="Beleg gespeichert">
            <div className="space-y-3 px-4 py-3">
              <p className="text-sm leading-snug text-[#8E8E93]">
                Du kannst jetzt weitere Fotos oder Seiten anhängen — z. B.
                Quittungen, Detailaufnahmen oder Folgeseiten.
              </p>
              <PressableButton
                type="button"
                variant="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black"
                onClick={() => {
                  setShowSavedPhotoHint(false);
                  setAddPhotosOpen(true);
                }}
              >
                <ImagePlus className="h-4 w-4" aria-hidden />
                Bilder hinzufügen
              </PressableButton>
            </div>
          </InsetGroupedCard>
        ) : null}

        <InsetGroupedCard header={isManual ? "Fotodoku" : "Original"}>
          <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-white">
                {fotodokuTitle}
              </p>
              {pageMetaLabel ? (
                <p className="mt-0.5 text-xs tabular-nums text-[#8E8E93]">
                  {pageMetaLabel}
                </p>
              ) : null}
            </div>
            {canAddPhotos ? (
              <PressableButton
                type="button"
                variant="button"
                className={cn(IOS_PILL, "shrink-0 text-[#0A84FF]")}
                onClick={() => setAddPhotosOpen(true)}
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                Bilder
              </PressableButton>
            ) : null}
          </div>
          <div className="px-3 pb-3">
            <DocumentOriginalPreview
              documentId={document.id}
              fileUrl={document.file_url}
              title={title}
              isManual={isManual}
              pageCount={document.page_count}
            />
          </div>
        </InsetGroupedCard>

        {canDeleteInvoice ? (
          <InsetGroupedCard
            footer={
              deleteError ? (
                <span role="alert" className="text-[#FF453A]">
                  {deleteError}
                </span>
              ) : undefined
            }
          >
            <InsetListRow
              icon={Trash2}
              iconTone="red"
              label={
                deleting
                  ? "Wird gelöscht…"
                  : documentDeleteButtonLabel(deleteDocumentType)
              }
              destructive
              disabled={deleting}
              onPress={handleDeleteInvoice}
            />
          </InsetGroupedCard>
        ) : null}

        <VehicleDataDisclaimer />
      </div>

      <InvoiceDetailEditPickerSheet
        open={editPickerOpen}
        onClose={() => setEditPickerOpen(false)}
        onSelect={handleEditPick}
        isManualEntry={isManual}
        addPhotosHref={manualAddPhotosHref}
        onAddPhotos={canAddPhotos ? () => setAddPhotosOpen(true) : undefined}
        addPhotosLabel={
          isUmbauManual
            ? "Bis zu 10 Bilder hinzufügen"
            : "Bilder hinzufügen"
        }
      />

      <InvoiceAddPhotosSheet
        open={addPhotosOpen}
        onClose={() => setAddPhotosOpen(false)}
        onSaved={() => router.refresh()}
        documentId={document.id}
        vehicleId={document.vehicle_id}
        tagUuid={tagUuid}
        fileUrl={document.file_url}
        pageCount={document.page_count}
        title={title}
      />

      <ReceiptActionBar
        originalHref={originalHref}
        originalLabel={originalLabel}
        onShare={() => {
          void handleShare();
        }}
        onEdit={
          useCentralEdit
            ? openCentralEdit
            : canEdit && isManual
              ? openManualEdit
              : undefined
        }
      />
    </IOSScreen>
  );
}
