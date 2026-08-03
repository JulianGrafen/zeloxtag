"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  FileText,
  Plus,
  Stamp,
  Trash2,
} from "lucide-react";

import { deleteDocument } from "@/actions/delete-document";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { VehicleInvoicesView } from "@/components/documents/vehicle-invoices-view";
import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import {
  displayDocumentTitle,
  documentTypeLabel,
  filterDocumentsByType,
  formatDocumentAmount,
  formatDocumentDate,
  sumInvoiceAmounts,
} from "@/lib/documents/format";
import { isViewableDocumentUrl } from "@/lib/documents/viewable-url";
import type { Document, DocumentType } from "@/types/database";

interface VehicleDocumentsViewProps {
  tagUuid: string;
  vehicleId: string;
  vehicleLabel: string;
  /** Short model label for invoice overview (e.g. RX-8). */
  vehicleModel?: string;
  documents: Document[];
  filterType?: DocumentType | "all";
}

const FILTERS: Array<{ id: DocumentType | "all"; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "invoice", label: "Rechnungen" },
  { id: "abe", label: "ABE" },
  { id: "tuev", label: "TÜV" },
  { id: "other", label: "Andere" },
];

export function VehicleDocumentsView({
  tagUuid,
  vehicleId,
  vehicleLabel,
  vehicleModel,
  documents,
  filterType = "all",
}: VehicleDocumentsViewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [viewer, setViewer] = useState<{
    title: string;
    fileUrl: string;
  } | null>(null);

  if (filterType === "invoice") {
    return (
      <VehicleInvoicesView
        tagUuid={tagUuid}
        vehicleModel={vehicleModel?.trim() || vehicleLabel.split("·")[0]?.trim() || vehicleLabel}
        documents={documents}
      />
    );
  }

  const filtered = filterDocumentsByType(documents, filterType);
  const invoiceSum = sumInvoiceAmounts(
    filterType === "all"
      ? documents.filter((doc) => doc.type === "invoice")
      : [],
  );

  function handleDelete(documentId: string) {
    const confirmed = window.confirm("Dokument wirklich löschen?");
    if (!confirmed) return;

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

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div
        className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5"
      >
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
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              ZeloxTag
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
              Dokumente
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleLabel} · {filtered.length} Einträge
            </p>
            {invoiceSum > 0 ? (
              <p className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                Rechnungen {formatDocumentAmount(invoiceSum)}
              </p>
            ) : null}
          </div>
        </header>

        <nav
          aria-label="Dokumentfilter"
          className="vd-anim-header flex gap-2 overflow-x-auto pb-1"
        >
          {FILTERS.map((filter) => {
            const active = filterType === filter.id;
            const href =
              filter.id === "all"
                ? `/v/${tagUuid}/dokumente`
                : `/v/${tagUuid}/dokumente?type=${filter.id}`;
            return (
              <PressableLink
                key={filter.id}
                href={href}
                variant="pill"
                nav="none"
                className={[
                  "shrink-0 rounded-full px-3.5 py-2 text-[0.78rem] font-semibold",
                  active
                    ? "bg-neutral-900 text-white"
                    : "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-muted)]",
                ].join(" ")}
              >
                {filter.label}
              </PressableLink>
            );
          })}
        </nav>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
          >
            {error}
          </p>
        ) : null}

        <section aria-label="Dokumentliste" className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-[0.9rem] text-[color:var(--vd-muted)] shadow-[var(--vd-shadow-sm)]">
              {filterType === "abe" ? (
                <div className="space-y-2">
                  <p>Noch keine ABE in dieser Kategorie.</p>
                  <p className="text-[0.82rem] leading-relaxed">
                    Pro Upload immer nur die ABE für{" "}
                    <span className="font-medium text-[color:var(--vd-text)]">
                      ein Bauteil
                    </span>
                    — und bitte{" "}
                    <span className="font-medium text-[color:var(--vd-text)]">
                      alle Seiten
                    </span>{" "}
                    dieses Gutachtens scannen.
                  </p>
                </div>
              ) : (
                "Noch keine Dokumente in dieser Kategorie."
              )}
            </div>
          ) : (
            <ul className="vd-anim-list overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
              {filtered.map((doc) => (
                <li key={doc.id}>
                  <DocumentRow
                    tagUuid={tagUuid}
                    document={doc}
                    deleting={pending && pendingId === doc.id}
                    onDelete={() => handleDelete(doc.id)}
                    onOpen={() => {
                      if (!isViewableDocumentUrl(doc.file_url)) return;
                      setViewer({
                        title: displayDocumentTitle(doc.title),
                        fileUrl: doc.file_url,
                      });
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {viewer ? (
        <DocumentViewer
          title={viewer.title}
          fileUrl={viewer.fileUrl}
          onClose={() => setViewer(null)}
        />
      ) : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <div className="pointer-events-auto mx-auto max-w-lg">
          <PressableLink
            href={
              filterType === "abe"
                ? `/v/${tagUuid}?scan=1&type=abe`
                : `/v/${tagUuid}?scan=1`
            }
            variant="button"
            className="claim-cta shadow-[var(--vd-shadow)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {filterType === "abe" ? "ABE scannen" : "Rechnung scannen"}
          </PressableLink>
        </div>
      </div>
    </div>
  );
}

function DocumentRow({
  tagUuid,
  document,
  deleting,
  onDelete,
  onOpen,
}: {
  tagUuid: string;
  document: Document;
  deleting: boolean;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const amount = formatDocumentAmount(document.amount);
  const isMock = document.file_url.startsWith("mock://");
  const canView = isViewableDocumentUrl(document.file_url);
  const Icon = document.type === "abe" ? Stamp : FileText;
  const canDelete = isMock || !document.file_url.startsWith("/demo/");
  const opensDetail =
    document.type === "invoice" || document.type === "abe";
  const detailHref = `/v/${tagUuid}/dokumente/${document.id}`;
  const lineCount = document.line_items?.length ?? 0;
  const approvalCount = document.vehicle_approvals?.length ?? 0;

  const subtitle =
    document.type === "invoice"
      ? document.vendor?.trim() || null
      : document.type === "abe"
        ? document.manufacturer?.trim() || null
        : null;

  const meta = (
    <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
      {documentTypeLabel(document.type)}
      {" · "}
      {formatDocumentDate(document.date)}
      {document.type === "invoice" && lineCount > 0
        ? ` · ${lineCount} Positionen`
        : ""}
      {document.type === "abe" && document.kba_number
        ? ` · ${document.kba_number}`
        : ""}
      {document.type === "abe" && approvalCount > 0
        ? ` · ${approvalCount} Freigaben`
        : ""}
      {isMock ? " · Demo-Upload (keine Datei)" : ""}
    </span>
  );

  const body = (
    <>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
              {displayDocumentTitle(document.title)}
            </span>
            {subtitle ? (
              <span className="mt-0.5 block truncate text-[0.75rem] text-[color:var(--vd-muted)]">
                {subtitle}
              </span>
            ) : null}
          </span>
          {amount ? (
            <span className="shrink-0 text-[0.88rem] font-semibold text-[color:var(--vd-text)]">
              {amount}
            </span>
          ) : null}
        </span>
        {meta}
      </span>
      {opensDetail || canView ? (
        <Eye
          className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
          aria-hidden
        />
      ) : null}
    </>
  );

  return (
    <div className="flex w-full items-center gap-2 px-3 py-3 text-left sm:px-4 sm:py-3.5">
      {opensDetail ? (
        <PressableLink
          href={detailHref}
          variant="row"
          className="vd-pressable vd-pressable--row group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left"
        >
          {body}
        </PressableLink>
      ) : canView ? (
        <button
          type="button"
          onClick={onOpen}
          className="vd-pressable vd-pressable--row group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}

      {canDelete ? (
        <PressableButton
          type="button"
          variant="button"
          aria-label={`Löschen: ${displayDocumentTitle(document.title)}`}
          disabled={deleting}
          onClick={onDelete}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--vd-border)] bg-white text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </PressableButton>
      ) : null}
    </div>
  );
}
