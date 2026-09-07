"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Copy, ChevronDown } from "lucide-react";

import { updatePublicShowcaseDocuments } from "@/actions/update-public-showcase-documents";
import { updateVehicleShowcaseSettings } from "@/actions/update-vehicle-showcase-settings";
import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";
import { ShowcaseMediaSettings } from "@/components/vehicles/showcase-media-settings";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { parseLineItems } from "@/lib/documents/line-items";
import {
  formatShowcaseDocumentLabel,
  partitionShowcaseSelectableDocuments,
} from "@/lib/vehicles/public-showcase-documents";
import {
  selectedShowcaseLineIndexes,
  showcaseLineItemsFromDocument,
} from "@/lib/vehicles/public-showcase-line-items";
import type { Document, Vehicle } from "@/types/database";

type VehicleShowcaseSettingsProps = {
  tagUuid: string;
  vehicle: Vehicle;
  documents: Document[];
  galleryPhotos: Document[];
  canEdit: boolean;
};

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-4 py-3">
      <span className="min-w-0">
        <span className="block text-[0.88rem] font-medium text-[color:var(--vd-text)]">
          {label}
        </span>
        <span className="mt-0.5 block text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--vd-accent)]"
      />
    </label>
  );
}

function DocumentCheckboxRow({
  label,
  meta,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  meta?: string | null;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-[0.84rem] font-medium text-[color:var(--vd-text)]">
          {label}
        </span>
        {meta ? (
          <span className="mt-0.5 block text-[0.74rem] text-[color:var(--vd-muted)]">
            {meta}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--vd-accent)]"
      />
    </label>
  );
}

function ShowcaseDocumentPicker({
  doc,
  meta,
  selected,
  selectedLines,
  disabled,
  onToggleDocument,
  onToggleLine,
}: {
  doc: Document;
  meta?: string | null;
  selected: boolean;
  selectedLines: number[];
  disabled?: boolean;
  onToggleDocument: (value: boolean) => void;
  onToggleLine: (index: number, value: boolean) => void;
}) {
  const positions = showcaseLineItemsFromDocument(doc);
  const selectedSet = new Set(selectedLines);

  return (
    <div className="space-y-1.5">
      <DocumentCheckboxRow
        label={formatShowcaseDocumentLabel(doc)}
        meta={meta}
        checked={selected}
        disabled={disabled}
        onChange={onToggleDocument}
      />
      {selected && positions.length > 0 ? (
        <div className="ml-3 space-y-1 border-l border-[color:var(--vd-border)] pl-3">
          <p className="px-1 text-[0.72rem] text-[color:var(--vd-muted)]">
            Sichtbare Positionen
          </p>
          {positions.map((item) => (
            <DocumentCheckboxRow
              key={`${doc.id}-${item.index}`}
              label={item.label}
              checked={selectedSet.has(item.index)}
              disabled={disabled}
              onChange={(value) => onToggleLine(item.index, value)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CollapsibleDocGroup({
  title,
  count,
  selectedCount,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  selectedCount: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group" open={defaultOpen}>
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.78rem] font-medium text-[color:var(--vd-text)] [&::-webkit-details-marker]:hidden"
      >
        <span>
          {title}
          <span className="ml-1.5 font-normal text-[color:var(--vd-muted)]">
            ({count})
          </span>
          {selectedCount > 0 ? (
            <span className="ml-1.5 font-normal text-[color:var(--vd-accent)]">
              · {selectedCount} sichtbar
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="mt-2 space-y-2">{children}</div>
    </details>
  );
}

function formatDocumentMeta(doc: Document): string | null {
  const parts: string[] = [];
  if (doc.vendor) parts.push(doc.vendor);
  if (doc.category) parts.push(doc.category);
  const positionCount = showcaseLineItemsFromDocument(doc).length;
  if (positionCount > 0) {
    parts.push(`${positionCount} Positionen`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function initialLineSelections(documents: Document[]): Record<string, number[]> {
  const selections: Record<string, number[]> = {};
  for (const doc of documents) {
    const items = parseLineItems(doc.line_items);
    if (!items?.length) continue;
    selections[doc.id] = selectedShowcaseLineIndexes(items);
  }
  return selections;
}

export function VehicleShowcaseSettings({
  tagUuid,
  vehicle,
  documents,
  galleryPhotos,
  canEdit,
}: VehicleShowcaseSettingsProps) {
  const { invoices, modifications } = useMemo(
    () => partitionShowcaseSelectableDocuments(documents),
    [documents],
  );

  const initialSelected = useMemo(
    () =>
      new Set(
        documents.filter((doc) => doc.show_on_public_showcase).map((doc) => doc.id),
      ),
    [documents],
  );

  const [isPublic, setIsPublic] = useState(Boolean(vehicle.is_public));
  const [hideFinancials, setHideFinancials] = useState(
    vehicle.hide_financials !== false,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelected);
  const [lineSelections, setLineSelections] = useState<Record<string, number[]>>(
    () => initialLineSelections(documents),
  );
  const [sharePath, setSharePath] = useState<string | null>(
    vehicle.is_public && vehicle.public_slug ? `/v/${vehicle.public_slug}` : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsPending, startSettingsTransition] = useTransition();
  const [documentsPending, startDocumentsTransition] = useTransition();

  const pending = settingsPending || documentsPending;
  const hasSelectableDocs = invoices.length > 0 || modifications.length > 0;
  const shareUrl = sharePath ? `${PRODUCTION_SITE_URL}${sharePath}` : null;
  const selectedModificationCount = modifications.filter((doc) =>
    selectedIds.has(doc.id),
  ).length;
  const selectedInvoiceCount = invoices.filter((doc) =>
    selectedIds.has(doc.id),
  ).length;

  function saveSettings(next: { isPublic?: boolean; hideFinancials?: boolean }) {
    if (!canEdit) return;

    const payload = {
      isPublic: next.isPublic ?? isPublic,
      hideFinancials: next.hideFinancials ?? hideFinancials,
    };

    startSettingsTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await updateVehicleShowcaseSettings({
        vehicleId: vehicle.id,
        tagUuid,
        isPublic: payload.isPublic,
        hideFinancials: payload.hideFinancials,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setSharePath(result.sharePath);
      setMessage(
        payload.isPublic
          ? "Showcase ist öffentlich — Link kann geteilt werden."
          : "Showcase ist privat.",
      );
    });
  }

  function persistShowcase(
    nextIds: Set<string>,
    nextLines: Record<string, number[]>,
    rollback?: () => void,
  ) {
    startDocumentsTransition(async () => {
      setError(null);
      const result = await updatePublicShowcaseDocuments({
        vehicleId: vehicle.id,
        tagUuid,
        documentIds: [...nextIds],
        lineSelections: nextLines,
      });

      if (result.status === "error") {
        setError(result.message);
        rollback?.();
        return;
      }

      setMessage("Öffentliche Inhalte aktualisiert.");
    });
  }

  function toggleDocument(doc: Document, enabled: boolean) {
    if (!canEdit) return;

    const previousIds = selectedIds;
    const previousLines = lineSelections;
    const nextIds = new Set(selectedIds);
    const nextLines = { ...lineSelections };
    const positions = showcaseLineItemsFromDocument(doc);

    if (enabled) {
      nextIds.add(doc.id);
      if (positions.length > 0) {
        nextLines[doc.id] = positions.map((item) => item.index);
      }
    } else {
      nextIds.delete(doc.id);
    }

    setSelectedIds(nextIds);
    setLineSelections(nextLines);
    persistShowcase(nextIds, nextLines, () => {
      setSelectedIds(previousIds);
      setLineSelections(previousLines);
    });
  }

  function toggleLineItem(
    documentId: string,
    lineIndex: number,
    enabled: boolean,
  ) {
    if (!canEdit) return;

    const previousIds = selectedIds;
    const previousLines = lineSelections;
    const nextIds = new Set(selectedIds);
    const current = new Set(lineSelections[documentId] ?? []);
    if (enabled) current.add(lineIndex);
    else current.delete(lineIndex);

    const nextLines = {
      ...lineSelections,
      [documentId]: [...current].sort((a, b) => a - b),
    };

    if (enabled) {
      nextIds.add(documentId);
    } else if (current.size === 0) {
      nextIds.delete(documentId);
    }

    setSelectedIds(nextIds);
    setLineSelections(nextLines);
    persistShowcase(nextIds, nextLines, () => {
      setSelectedIds(previousIds);
      setLineSelections(previousLines);
    });
  }

  async function copyShareLink() {
    if (!shareUrl || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Link kopiert.");
    } catch {
      setError("Link konnte nicht kopiert werden.");
    }
  }

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
        Öffentliches Profil
      </h2>

      <div className="mt-4 space-y-2">
        <ToggleRow
          label="Profil veröffentlichen"
          description="Showcase-Seite mit Share-Link aktivieren"
          checked={isPublic}
          disabled={!canEdit || pending}
          onChange={(value) => {
            setIsPublic(value);
            saveSettings({ isPublic: value });
          }}
        />
        {isPublic ? (
          <ToggleRow
            label="Preise ausblenden"
            description="Beträge auf der öffentlichen Seite verbergen"
            checked={hideFinancials}
            disabled={!canEdit || pending}
            onChange={(value) => {
              setHideFinancials(value);
              saveSettings({ hideFinancials: value });
            }}
          />
        ) : null}
      </div>

      {isPublic && shareUrl ? (
        <div className="mt-4 flex items-stretch gap-2">
          <p
            className="min-w-0 flex-1 truncate rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 font-mono text-[0.76rem] leading-snug text-[color:var(--vd-text)]"
            title={shareUrl}
          >
            {shareUrl.replace(/^https?:\/\//, "")}
          </p>
          <PressableButton
            type="button"
            variant="button"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.8rem] font-medium"
            onClick={copyShareLink}
          >
            <Copy className="h-4 w-4" aria-hidden />
            Kopieren
          </PressableButton>
        </div>
      ) : null}

      <div className="mt-5 border-t border-[color:var(--vd-border)] pt-5">
        <ShowcaseMediaSettings
          tagUuid={tagUuid}
          vehicle={vehicle}
          galleryPhotos={galleryPhotos}
          canEdit={canEdit}
        />
      </div>

      {isPublic ? (
        <div className="mt-5 space-y-3 border-t border-[color:var(--vd-border)] pt-5">
          {!hasSelectableDocs ? (
            <p className="rounded-xl border border-dashed border-[color:var(--vd-border)] px-4 py-3 text-[0.82rem] text-[color:var(--vd-muted)]">
              Noch keine Belege oder Umbauten.
            </p>
          ) : null}

          {modifications.length > 0 ? (
            <CollapsibleDocGroup
              title="Umbauten"
              count={modifications.length}
              selectedCount={selectedModificationCount}
              defaultOpen={modifications.length <= 3}
            >
              {modifications.map((doc) => (
                <ShowcaseDocumentPicker
                  key={doc.id}
                  doc={doc}
                  meta={doc.vendor ?? doc.date?.slice(0, 10) ?? null}
                  selected={selectedIds.has(doc.id)}
                  selectedLines={lineSelections[doc.id] ?? []}
                  disabled={!canEdit || documentsPending}
                  onToggleDocument={(value) => toggleDocument(doc, value)}
                  onToggleLine={(index, value) =>
                    toggleLineItem(doc.id, index, value)
                  }
                />
              ))}
            </CollapsibleDocGroup>
          ) : null}

          {invoices.length > 0 ? (
            <CollapsibleDocGroup
              title="Rechnungen"
              count={invoices.length}
              selectedCount={selectedInvoiceCount}
            >
              {invoices.map((doc) => (
                <ShowcaseDocumentPicker
                  key={doc.id}
                  doc={doc}
                  meta={formatDocumentMeta(doc)}
                  selected={selectedIds.has(doc.id)}
                  selectedLines={lineSelections[doc.id] ?? []}
                  disabled={!canEdit || documentsPending}
                  onToggleDocument={(value) => toggleDocument(doc, value)}
                  onToggleLine={(index, value) =>
                    toggleLineItem(doc.id, index, value)
                  }
                />
              ))}
            </CollapsibleDocGroup>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p className="mt-3 text-[0.82rem] text-[color:var(--vd-accent)]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[0.82rem] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
