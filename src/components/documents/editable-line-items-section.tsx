"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { GarageInsetInput } from "@/components/ui/garage-field";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import type { DocumentLineItem } from "@/types/database";
import type { InvoiceDetailEditTarget } from "@/lib/documents/invoice-detail-edit";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { cn } from "@/lib/utils";

const EDIT_TARGET: InvoiceDetailEditTarget = "lineItems";

const SECTION_HEADING_CLASS =
  "text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]";

type EditableLineItemsSectionProps = {
  items: DocumentLineItem[];
  /** When set, saves via server action. When omitted, only calls onChange. */
  documentId?: string;
  vehicleId?: string;
  tagUuid?: string;
  /** Local edit (scan review) — parent owns persistence on final save. */
  onChange?: (items: DocumentLineItem[]) => void;
  /** Optional document total shown under the list. */
  totalAmount?: number | null;
  emptyHint?: string;
  /** Inline: always editable rows (scan review). Default: read-only until Bearbeiten. */
  mode?: "default" | "inline";
  hideEditTrigger?: boolean;
  editRequest?: InvoiceDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
  /** Optional outer card (e.g. zt-feature-panel on Beleg-Detail). */
  shellClassName?: string;
  /** Hide built-in „Positionen“ heading (e.g. iOS InsetGroupedCard header). */
  hideHeading?: boolean;
  /** Custom read-only presentation; the built-in editor is still used while editing. */
  renderReadView?: (items: DocumentLineItem[]) => ReactNode;
};

type DraftItem = {
  key: string;
  label: string;
  amount: string;
  showOnPublicShowcase?: boolean;
};

function toDraft(items: DocumentLineItem[]): DraftItem[] {
  if (items.length === 0) {
    return [{ key: crypto.randomUUID(), label: "", amount: "" }];
  }
  return items.map((item) => ({
    key: crypto.randomUUID(),
    label: item.label,
    amount:
      Number.isFinite(item.amount) ? String(item.amount).replace(".", ",") : "",
    showOnPublicShowcase: item.showOnPublicShowcase,
  }));
}

function parseDraft(draft: DraftItem[]): DocumentLineItem[] {
  const items: DocumentLineItem[] = [];
  for (const row of draft) {
    const label = row.label.trim().slice(0, 160);
    if (!label) continue;
    const amount = Number.parseFloat(row.amount.trim().replace(",", "."));
    if (!Number.isFinite(amount)) continue;
    items.push({
      label,
      amount: Math.round(amount * 100) / 100,
      ...(typeof row.showOnPublicShowcase === "boolean"
        ? { showOnPublicShowcase: row.showOnPublicShowcase }
        : {}),
    });
    if (items.length >= 40) break;
  }
  return items;
}

/**
 * Positionen: read-only until the user clicks „Bearbeiten“.
 */
export function EditableLineItemsSection({
  items,
  documentId,
  vehicleId,
  tagUuid,
  onChange,
  totalAmount = null,
  emptyHint = "Keine Positionen erkannt. Original-PDF unten öffnen.",
  mode = "default",
  hideEditTrigger = false,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
  shellClassName,
  hideHeading = false,
  renderReadView,
}: EditableLineItemsSectionProps) {
  const inline = mode === "inline";
  const [editing, setEditing] = useState(inline);
  const [draft, setDraft] = useState<DraftItem[]>(() => toDraft(items));
  const [displayItems, setDisplayItems] = useState(items);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayItems(items);
    } else if (inline) {
      setDraft(toDraft(items));
    }
  }, [items, editing, inline]);

  const persistLocally = Boolean(onChange) && !documentId;

  function applyDraft(nextDraft: DraftItem[]) {
    setDraft(nextDraft);
    if (inline && onChange) {
      const next = parseDraft(nextDraft);
      setDisplayItems(next);
      onChange(next);
    }
  }

  function startEdit() {
    setError(null);
    setDraft(toDraft(displayItems));
    setEditing(true);
  }

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0 || inline) return;
    setError(null);
    setDraft(toDraft(displayItems));
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, inline, onEditRequestConsumed, displayItems]);

  function cancelEdit() {
    setError(null);
    setDraft(toDraft(displayItems));
    setEditing(false);
  }

  function commit() {
    const next = parseDraft(draft);
    setError(null);

    if (persistLocally) {
      onChange?.(next);
      setDisplayItems(next);
      setEditing(false);
      return;
    }

    if (!documentId || !vehicleId || !tagUuid) {
      setError("Speichern nicht möglich.");
      return;
    }

    startTransition(async () => {
      const result = await updateDocumentFields({
        documentId,
        vehicleId,
        tagUuid,
        lineItems: next,
      });
      if (isActionFailure(result)) {
        setError(result.message);
        return;
      }
      showSavedToast();
      setDisplayItems(next);
      onChange?.(next);
      setEditing(false);
    });
  }

  const showSection =
    inline ||
    editing ||
    displayItems.length > 0 ||
    editRequest === EDIT_TARGET;

  if (!showSection) {
    return null;
  }

  if (renderReadView && !editing && !inline) {
    return (
      <div id={sectionId} className="scroll-mt-24">
        {renderReadView(displayItems)}
      </div>
    );
  }

  const content = (
    <div className="space-y-3">
      {hideHeading ? null : (
      <div className="flex items-center justify-between gap-3 px-0.5">
        <h2 className={SECTION_HEADING_CLASS}>Positionen</h2>
        {!editing && !inline && !hideEditTrigger ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1 text-[0.8rem] font-medium text-[color:var(--vd-field-label)] transition-opacity active:opacity-70"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Bearbeiten
          </PressableButton>
        ) : null}
      </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <ul className="garage-grouped-list">
            {draft.map((row, index) => (
              <li
                key={row.key}
                className="garage-grouped-list__row garage-grouped-list__row--edit !py-2"
              >
                <GarageInsetInput
                  value={row.label}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => {
                      const next = current.map((entry, i) =>
                        i === index ? { ...entry, label: value } : entry,
                      );
                      if (inline && onChange) {
                        const parsed = parseDraft(next);
                        setDisplayItems(parsed);
                        onChange(parsed);
                      }
                      return next;
                    });
                  }}
                  placeholder="Bezeichnung"
                  className="min-w-0 !px-0 !py-1 text-[0.875rem]"
                />
                <GarageInsetInput
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => {
                      const next = current.map((entry, i) =>
                        i === index ? { ...entry, amount: value } : entry,
                      );
                      if (inline && onChange) {
                        const parsed = parseDraft(next);
                        setDisplayItems(parsed);
                        onChange(parsed);
                      }
                      return next;
                    });
                  }}
                  placeholder="€"
                  className="w-full text-right !px-0 !py-1 text-[0.875rem] tabular-nums"
                />
                <PressableButton
                  type="button"
                  variant="button"
                  aria-label="Position entfernen"
                  onClick={() => {
                    applyDraft(
                      draft.length <= 1
                        ? [{ key: crypto.randomUUID(), label: "", amount: "" }]
                        : draft.filter((_, i) => i !== index),
                    );
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--vd-muted)] active:opacity-70"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </PressableButton>
              </li>
            ))}
          </ul>

          <PressableButton
            type="button"
            variant="button"
            onClick={() => {
              applyDraft([
                ...draft,
                { key: crypto.randomUUID(), label: "", amount: "" },
              ]);
            }}
            className="claim-back inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--vd-radius-field)] px-3 py-2.5 text-[0.82rem] font-medium"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Position hinzufügen
          </PressableButton>

          {error ? (
            <p className="vd-alert-error" role="alert">
              {error}
            </p>
          ) : null}

          {!inline ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <PressableButton
                type="button"
                variant="button"
                disabled={pending}
                onClick={cancelEdit}
                className="claim-back inline-flex items-center justify-center rounded-[var(--vd-radius-field)] px-3 py-2.5 text-[0.85rem] font-medium"
              >
                Abbrechen
              </PressableButton>
              <PressableButton
                type="button"
                variant="button"
                disabled={pending}
                onClick={commit}
                className="claim-cta inline-flex items-center justify-center rounded-[var(--vd-radius-field)] px-3 py-2.5 text-[0.85rem] font-semibold disabled:opacity-60"
              >
                {pending ? "Speichern…" : "Übernehmen"}
              </PressableButton>
            </div>
          ) : null}
        </div>
      ) : displayItems.length === 0 ? (
        <p className="px-0.5 text-[0.875rem] text-[color:var(--vd-muted)]">
          {emptyHint}
        </p>
      ) : (
        <ul className="garage-grouped-list">
          {displayItems.map((item, index) => (
            <li key={`${item.label}-${index}`} className="garage-grouped-list__row">
              <span className="garage-grouped-list__label">{item.label}</span>
              <span className="garage-grouped-list__value">
                {formatEur(item.amount)}
              </span>
            </li>
          ))}
          {totalAmount !== null ? (
            <li className="garage-grouped-list__row garage-grouped-list__row--total">
              <span className="garage-grouped-list__label">Gesamt</span>
              <span className="garage-grouped-list__value">
                {formatEur(totalAmount)}
              </span>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );

  if (shellClassName) {
    return (
      <section
        id={sectionId}
        className={cn("scroll-mt-24", shellClassName)}
      >
        {content}
      </section>
    );
  }

  return (
    <section id={sectionId} className="scroll-mt-24 space-y-3">
      {content}
    </section>
  );
}
