"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Receipt,
  Share2,
  Trash2,
} from "lucide-react";

import { deleteDocument } from "@/actions/delete-document";

import { ApprovalFieldsSection } from "@/components/documents/approval-fields-section";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { EditableTuevHuSection } from "@/components/documents/editable-tuev-hu-section";
import { EditableTuevDefectsSection } from "@/components/documents/editable-tuev-defects-section";
import { EditableTitleSection } from "@/components/documents/editable-title-section";
import { EditableVendorSection } from "@/components/documents/editable-vendor-section";
import { EditableLineItemsSection } from "@/components/documents/editable-line-items-section";
import { TuevDefectsSection } from "@/components/documents/tuev-defects-section";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import {
  displayDocumentTitle,
  formatMileageKmLabel,
  formatDocumentDateCompact,
} from "@/lib/documents/format";
import {
  displayManualInvoiceNumber,
  isManualVehicleEntry,
} from "@/lib/documents/manual-entries";
import {
  documentDeleteButtonLabel,
  documentDeleteConfirmMessage,
} from "@/lib/documents/constants";
import { resolveDocumentMileageKm } from "@/lib/documents/document-mileage";
import { resolveInvoicePaymentBadge } from "@/lib/documents/payment-status";
import {
  documentMediaKind,
  isViewableDocumentUrl,
  resolveDocumentViewUrl,
} from "@/lib/documents/viewable-url";
import type { Document } from "@/types/database";

interface DocumentInvoiceDetailViewProps {
  tagUuid: string;
  vehicleLabel: string;
  document: Document;
  backHref?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

function fileNameFromUrl(fileUrl: string, fallback: string): string {
  try {
    const path = fileUrl.split("?")[0] ?? fileUrl;
    const name = path.split("/").pop();
    if (name && name.includes(".")) return decodeURIComponent(name);
  } catch {
    // ignore
  }
  return `${fallback.replace(/\s+/g, "_")}.pdf`;
}

/**
 * Structured invoice detail (metadata + line items + inline original PDF).
 */
export function DocumentInvoiceDetailView({
  tagUuid,
  vehicleLabel,
  document,
  backHref,
  canEdit = false,
  canDelete = false,
}: DocumentInvoiceDetailViewProps) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [vendorLabel, setVendorLabel] = useState(
    () => document.vendor?.trim() || displayDocumentTitle(document.title),
  );
  const [title, setTitle] = useState(() => displayDocumentTitle(document.title));
  const lineItems = document.line_items ?? [];
  const canOpenOriginal = isViewableDocumentUrl(document.file_url);
  const previewSrc = canOpenOriginal
    ? resolveDocumentViewUrl(document.file_url)
    : null;
  const previewKind = canOpenOriginal
    ? documentMediaKind(document.file_url)
    : null;
  const isManual = isManualVehicleEntry(document);
  const paymentBadge = resolveInvoicePaymentBadge(document);
  const canEditInvoice =
    canEdit && document.type === "invoice" && Boolean(document.vehicle_id);
  const canEditVendor = canEditInvoice;
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
      router.push(resolvedBack);
      router.refresh();
    });
  }
  const fileName = fileNameFromUrl(document.file_url, title);
  const issuedLabel = formatDocumentDateCompact(document.date);
  const scannedLabel = formatDocumentDateCompact(document.created_at);
  const resolvedMileageKm = resolveDocumentMileageKm(document);
  const mileageLabel =
    resolvedMileageKm !== null ? formatMileageKmLabel(resolvedMileageKm) : null;
  const vendor = vendorLabel.trim() || title;
  const category = document.category?.trim() || (isManual ? "Eintrag" : "Beleg");
  const invoiceNumberLabel = displayManualInvoiceNumber(document.invoice_number);

  const tuevApprovalFields =
    document.approval_fields?.kind === "tuev"
      ? document.approval_fields
      : null;
  const isTuevDocument =
    document.type === "tuev" || Boolean(tuevApprovalFields);

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

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="vd-anim-stack relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <PressableLink
          href={resolvedBack}
          variant="pill"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück zur Liste
        </PressableLink>

        <header className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
                {category} · {isManual ? "Eigener Eintrag" : "Beleg"}
              </p>
              {canEditInvoice ? (
                <div className="mt-2">
                  <EditableTitleSection
                    documentId={document.id}
                    vehicleId={document.vehicle_id}
                    tagUuid={tagUuid}
                    title={title}
                    onSaved={setTitle}
                  />
                </div>
              ) : (
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.65rem]">
                  {title}
                </h1>
              )}
              <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
                {vendor}
                {vehicleLabel ? ` · ${vehicleLabel}` : ""}
              </p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <Receipt className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {paymentBadge ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  {paymentBadge}
                </span>
              ) : null}
              {issuedLabel ? (
                <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--vd-muted)]">
                  {issuedLabel}
                </span>
              ) : null}
            </div>
            {document.amount !== null ? (
              <p className="text-[1.35rem] font-bold tracking-[-0.03em] tabular-nums text-[color:var(--vd-text)]">
                {formatEur(document.amount)}
              </p>
            ) : null}
          </div>
        </header>

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

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
          {canEditVendor ? (
            <EditableVendorSection
              documentId={document.id}
              vehicleId={document.vehicle_id}
              tagUuid={tagUuid}
              vendor={document.vendor}
              label="Werkstatt"
              placeholder="z. B. Auto Meister GmbH"
              onSaved={(nextVendor) =>
                setVendorLabel(nextVendor?.trim() || title)
              }
            />
          ) : document.type === "invoice" ? (
            <p className="text-[0.9rem] font-medium text-[color:var(--vd-text)]">
              {vendor}
            </p>
          ) : null}

          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-[color:var(--vd-border)] pt-3 text-[0.82rem]">
            <div>
              <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
                Belegnr.
              </dt>
              <dd className="mt-0.5 font-medium tabular-nums text-[color:var(--vd-text)]">
                {invoiceNumberLabel || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
                Datum
              </dt>
              <dd className="mt-0.5 font-medium text-[color:var(--vd-text)]">
                {issuedLabel || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
                KM
              </dt>
              <dd className="mt-0.5 font-medium tabular-nums text-[color:var(--vd-text)]">
                {mileageLabel ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

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
            totalAmount={document.amount}
            emptyHint={
              isManual
                ? "Noch keine Positionen. Bearbeiten tippen, um Teile und Kosten einzutragen."
                : "Keine Positionen erkannt. Original-PDF unten öffnen."
            }
          />
        ) : !isTuevDocument ? (
          <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
            <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
              Positionen
            </h2>
            {lineItems.length === 0 ? (
              <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
                Keine Positionen erkannt. Original-PDF unten öffnen.
              </p>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-[color:var(--vd-border)]">
                {lineItems.map((item, index) => (
                  <li
                    key={`${item.label}-${index}`}
                    className={[
                      "flex items-start justify-between gap-3 px-3 py-2.5 text-[0.88rem]",
                      index % 2 === 0
                        ? "bg-[color:var(--vd-surface)]"
                        : "bg-[color:var(--vd-surface-elevated)]/80",
                      index > 0 ? "border-t border-[color:var(--vd-border)]/60" : "",
                    ].join(" ")}
                  >
                    <span className="whitespace-pre-line text-[color:var(--vd-text)]">
                      {item.label}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-[color:var(--vd-text)]">
                      {formatEur(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {document.amount !== null ? (
              <div className="mt-5 flex items-center justify-between border-t border-[color:var(--vd-border)] pt-3">
                <span className="text-[0.95rem] font-bold tracking-[-0.02em] text-[color:var(--vd-text)]">
                  Gesamt
                </span>
                <span className="text-[1.05rem] font-bold tracking-[-0.02em] tabular-nums text-[color:var(--vd-text)]">
                  {formatEur(document.amount)}
                </span>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[color:var(--vd-border)] bg-neutral-100 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[0.75rem] font-medium text-[color:var(--vd-text)]">
                {fileName}
              </p>
              <p className="text-[0.68rem] text-[color:var(--vd-muted)]">
                {isManual ? "Fotodoku" : "Original-PDF"}
                {scannedLabel
                  ? ` · ${isManual ? "erstellt" : "gescannt"} ${scannedLabel}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {canOpenOriginal && previewSrc ? (
              previewKind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt={title}
                  className="max-h-[50vh] w-full rounded-xl bg-neutral-100 object-contain"
                />
              ) : (
                <iframe
                  title={title}
                  src={previewSrc}
                  className="h-[min(50vh,28rem)] w-full rounded-xl border border-[color:var(--vd-border)] bg-white"
                />
              )
            ) : (
              <p className="rounded-xl bg-neutral-50 px-3 py-2.5 text-[0.8rem] text-[color:var(--vd-muted)]">
                {isManual
                  ? "Für diesen Eintrag liegt kein Foto vor."
                  : "Originaldatei konnte nicht geladen werden. Bitte erneut hochladen oder Support kontaktieren."}
              </p>
            )}
            {canOpenOriginal && previewSrc ? (
              <>
                <PressableLink
                  href={previewSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white shadow-[var(--vd-shadow-sm)]"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  Original öffnen
                </PressableLink>
                <PressableLink
                  href={previewSrc}
                  download={fileName}
                  variant="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3 text-[0.85rem] font-semibold text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  PDF herunterladen
                </PressableLink>
              </>
            ) : null}
          </div>
        </section>

        {canDeleteInvoice ? (
          <div className="space-y-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={deleting}
              onClick={handleDeleteInvoice}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-[0.88rem] font-semibold text-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {deleting
                ? "Wird gelöscht…"
                : documentDeleteButtonLabel(deleteDocumentType)}
            </PressableButton>
            {deleteError ? (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
              >
                {deleteError}
              </p>
            ) : null}
          </div>
        ) : null}

        <VehicleDataDisclaimer />
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <div className="pointer-events-auto mx-auto max-w-lg">
          <PressableButton
            type="button"
            variant="button"
            onClick={() => {
              void handleShare();
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 text-[0.88rem] font-semibold text-[color:var(--vd-text)] shadow-[var(--vd-shadow)]"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Teilen
          </PressableButton>
        </div>
      </div>
    </div>
  );
}
