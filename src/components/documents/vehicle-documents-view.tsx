"use client";

import { useMemo, useState, useTransition } from "react";
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
import { ListSearchControls } from "@/components/documents/list-search-controls";
import { VehicleDataDisclaimer } from "@/components/documents/vehicle-data-disclaimer";
import { VehicleInvoicesView } from "@/components/documents/vehicle-invoices-view";
import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { approvalKindLabel } from "@/lib/documents/approval-fields";
import {
  filterAbeFamilyDocumentsByKind,
  resolveAbeFamilyKind,
  type AbeFamilyKind,
} from "@/lib/documents/abe-family-documents";
import { displayAbeDocumentTitle } from "@/lib/documents/abe-title";
import { documentDeleteConfirmMessage } from "@/lib/documents/constants";
import {
  displayDocumentTitle,
  documentTypeLabel,
  filterDocumentsByType,
  formatDocumentAmount,
  formatDocumentDate,
  sumInvoiceAmounts,
} from "@/lib/documents/format";
import type { InvoiceListCategory } from "@/lib/documents/invoice-categories";
import {
  matchesSearchQuery,
} from "@/lib/documents/list-search";
import { eintraegeLabel } from "@/lib/i18n/pluralize-de";
import { isViewableDocumentUrl } from "@/lib/documents/viewable-url";
import type { Document, DocumentType } from "@/types/database";

const ALL_ABE_KIND = "all";

const ABE_KIND_LABELS: Record<AbeFamilyKind, string> = {
  abe: "ABE",
  teilegutachten: "Teilegutachten",
  pruefung192: "§19(2) Prüfung",
  einzelabnahme: "Einzelabnahme",
};

interface VehicleDocumentsViewProps {
  tagUuid: string;
  vehicleId: string;
  vehicleLabel: string;
  /** Short model label for invoice overview (e.g. RX-8). */
  vehicleModel?: string;
  documents: Document[];
  filterType?: DocumentType | "all";
  /** Owner-only scan / delete actions. */
  canWrite?: boolean;
  /** Prefill invoice category chip when showing Belege. */
  invoiceCategory?: InvoiceListCategory | "all";
}

const FILTERS: Array<{ id: DocumentType | "all"; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "invoice", label: "Rechnungen" },
  { id: "abe", label: "Gutachten" },
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
  canWrite = false,
  invoiceCategory = "all",
}: VehicleDocumentsViewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [abeKindId, setAbeKindId] = useState<string>(ALL_ABE_KIND);

  const typed = useMemo(
    () => filterDocumentsByType(documents, filterType),
    [documents, filterType],
  );

  const abeKindChips = useMemo(() => {
    if (filterType !== "abe") return [];
    const counts: Record<AbeFamilyKind, number> = {
      abe: 0,
      teilegutachten: 0,
      pruefung192: 0,
      einzelabnahme: 0,
    };
    for (const doc of typed) {
      const kind = resolveAbeFamilyKind(doc);
      if (kind) counts[kind] += 1;
    }
    return [
      { id: ALL_ABE_KIND, label: "Alle", count: typed.length },
      ...Object.entries(ABE_KIND_LABELS).map(([id, label]) => ({
        id,
        label,
        count: counts[id as AbeFamilyKind],
      })),
    ];
  }, [filterType, typed]);

  const { filtered, filterBaseCount } = useMemo(() => {
    const byKind =
      filterType === "abe"
        ? filterAbeFamilyDocumentsByKind(
            typed,
            abeKindId === ALL_ABE_KIND ? "all" : (abeKindId as AbeFamilyKind),
          )
        : typed;

    const result = byKind.filter((doc) =>
      matchesSearchQuery(
        query,
        doc.title,
        doc.manufacturer,
        doc.vendor,
        doc.part_category,
        doc.kba_number,
        doc.authority,
        doc.notes,
        doc.category,
        documentTypeLabel(doc.type),
        approvalKindLabel(doc.approval_fields),
        ...(doc.vehicle_approvals ?? []),
      ),
    );

    return { filtered: result, filterBaseCount: byKind.length };
  }, [typed, filterType, abeKindId, query]);

  const invoiceSum = sumInvoiceAmounts(
    filterType === "all"
      ? documents.filter((doc) => doc.type === "invoice")
      : [],
  );

  const searchResultLabel =
    filtered.length === filterBaseCount && !query.trim()
      ? undefined
      : `${filtered.length} von ${filterBaseCount} Treffern`;

  if (filterType === "invoice") {
    return (
      <VehicleInvoicesView
        tagUuid={tagUuid}
        vehicleModel={vehicleModel?.trim() || vehicleLabel.split("·")[0]?.trim() || vehicleLabel}
        documents={documents}
        canWrite={canWrite}
        initialCategory={invoiceCategory}
      />
    );
  }

  function handleDelete(document: Document) {
    if (!canWrite) return;
    const title =
      document.type === "abe"
        ? displayAbeDocumentTitle(document)
        : displayDocumentTitle(document.title);
    const deleteType =
      document.type === "tuev" || document.approval_fields?.kind === "tuev"
        ? "tuev"
        : document.type;
    if (!window.confirm(documentDeleteConfirmMessage(deleteType, title))) return;

    setError(null);
    setPendingId(document.id);
    startTransition(async () => {
      const result = await deleteDocument({
        documentId: document.id,
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
              {filterType === "abe"
                ? "ABE & Gutachten"
                : filterType === "tuev"
                  ? "TÜV / HU"
                  : "Dokumente"}
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {filterType === "abe"
                ? `${vehicleLabel} · ABE, Teilegutachten & Einzelabnahmen · ${eintraegeLabel(filtered.length)}`
                : `${vehicleLabel} · ${eintraegeLabel(filtered.length)}`}
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

        <ListSearchControls
          query={query}
          onQueryChange={setQuery}
          placeholder={
            filterType === "abe"
              ? "Teil, Hersteller, KBA, Freigabe…"
              : filterType === "tuev"
                ? "Prüfstelle, Titel, Notiz…"
                : "Titel, Hersteller, Kategorie…"
          }
          chips={filterType === "abe" ? abeKindChips : undefined}
          activeChipId={abeKindId}
          onChipChange={setAbeKindId}
          resultLabel={searchResultLabel}
        />

        <section aria-label="Dokumentliste" className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-[0.9rem] text-[color:var(--vd-muted)] shadow-[var(--vd-shadow-sm)]">
              {typed.length > 0 &&
              (query.trim() ||
                (filterType === "abe" && abeKindId !== ALL_ABE_KIND)) ? (
                "Keine Treffer für diese Suche / Filter."
              ) : filterType === "abe" ? (
                <div className="space-y-2">
                  <p>Noch kein Gutachten hinterlegt.</p>
                  <p className="text-[0.82rem] leading-relaxed">
                    Hier gehören{" "}
                    <span className="font-medium text-[color:var(--vd-text)]">
                      ABE, Teilegutachten und Einzelabnahmen
                    </span>
                    . Pro Upload immer nur{" "}
                    <span className="font-medium text-[color:var(--vd-text)]">
                      ein Bauteil
                    </span>
                    — bitte alle Seiten des Dokuments scannen.
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
                    canDelete={canWrite}
                    deleting={pending && pendingId === doc.id}
                    onDelete={() => handleDelete(doc)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <VehicleDataDisclaimer />
      </div>

      {canWrite ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <div className="pointer-events-auto mx-auto max-w-lg">
            <PressableLink
              href={
                filterType === "tuev"
                  ? `/v/${tagUuid}?scan=1&type=tuev`
                  : filterType === "abe"
                    ? `/v/${tagUuid}?scan=1&type=abe`
                    : `/v/${tagUuid}?scan=1`
              }
              variant="button"
              className="claim-cta shadow-[var(--vd-shadow)]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {filterType === "abe"
                ? "Gutachten scannen"
                : filterType === "tuev"
                  ? "TÜV scannen"
                  : "Dokument scannen"}
            </PressableLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DocumentRow({
  tagUuid,
  document,
  canDelete: allowDelete,
  deleting,
  onDelete,
}: {
  tagUuid: string;
  document: Document;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const amount = formatDocumentAmount(document.amount);
  const isMock = document.file_url.startsWith("mock://");
  const canView = isViewableDocumentUrl(document.file_url);
  const Icon = document.type === "abe" ? Stamp : FileText;
  const canDelete =
    allowDelete && (isMock || !document.file_url.startsWith("/demo/"));
  const detailHref = `/v/${tagUuid}/dokumente/${document.id}`;
  const lineCount = document.line_items?.length ?? 0;
  const approvalCount = document.vehicle_approvals?.length ?? 0;

  const listTitle =
    document.type === "abe"
      ? displayAbeDocumentTitle(document)
      : displayDocumentTitle(document.title);
  const manufacturer = document.manufacturer?.trim() || "";
  const model = document.vendor?.trim() || "";
  const subtitle =
    document.type === "invoice"
      ? document.vendor?.trim() || null
      : document.type === "abe"
        ? // Title is already "Hersteller Modell" — only show leftover model/brand if needed.
          manufacturer &&
          !listTitle.toLowerCase().startsWith(manufacturer.toLowerCase())
            ? manufacturer
            : model &&
                !listTitle.toLowerCase().includes(model.toLowerCase())
              ? model
              : null
        : null;

  const typeLabel =
    document.type === "abe" &&
    document.approval_fields &&
    document.approval_fields.kind !== "abe"
      ? approvalKindLabel(document.approval_fields)
      : document.type === "tuev" && document.approval_fields?.kind === "tuev"
        ? approvalKindLabel(document.approval_fields)
        : documentTypeLabel(document.type);

  const meta = (
    <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
      {typeLabel}
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
            <span className="block truncate font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]" title={listTitle}>
              {listTitle}
            </span>
            {subtitle ? (
              <span className="mt-0.5 block truncate text-[0.75rem] text-[color:var(--vd-muted)]" title={subtitle}>
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
      {canView ? (
        <Eye
          className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
          aria-hidden
        />
      ) : null}
    </>
  );

  return (
    <div className="flex w-full items-center gap-2 px-3 py-3 text-left sm:px-4 sm:py-3.5">
      <PressableLink
        href={detailHref}
        variant="row"
        className="vd-pressable vd-pressable--row group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left"
      >
        {body}
      </PressableLink>

      {canDelete ? (
        <PressableButton
          type="button"
          variant="button"
          aria-label={`Löschen: ${listTitle}`}
          disabled={deleting}
          onClick={onDelete}
          className={[
            "inline-flex shrink-0 items-center justify-center rounded-lg border border-red-200/80 bg-red-50/80 text-red-700 disabled:opacity-50",
            document.type === "abe"
              ? "h-8 w-8"
              : "h-10 w-10 rounded-xl border-[color:var(--vd-border)] bg-white text-red-600",
          ].join(" ")}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </PressableButton>
      ) : null}
    </div>
  );
}
