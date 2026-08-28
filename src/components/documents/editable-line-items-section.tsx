"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import type { DocumentLineItem } from "@/types/database";

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

function zebraRowClass(index: number): string {
  return index % 2 === 0
    ? "bg-[color:var(--vd-surface)]"
    : "bg-[color:var(--vd-surface-elevated)]/80";
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
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setDisplayItems(next);
      onChange?.(next);
      setEditing(false);
    });
  }

  return (
    <section
      className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Positionen
        </h2>
        {!editing && !inline ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-1.5 text-[0.72rem] font-medium text-[color:var(--vd-text)]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Bearbeiten
          </PressableButton>
        ) : null}
      </div>

      {editing ? (
        <div className="space-y-3">
          <ul className="overflow-hidden rounded-xl border border-[color:var(--vd-border)]">
            {draft.map((row, index) => (
              <li
                key={row.key}
                className={[
                  "grid grid-cols-[1fr_6.5rem_auto] items-start gap-2 px-2 py-2.5 sm:px-3",
                  zebraRowClass(index),
                  index > 0 ? "border-t border-[color:var(--vd-border)]/60" : "",
                ].join(" ")}
              >
                <input
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
                  className="claim-input min-w-0 text-[0.88rem]"
                />
                <input
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
                  className="claim-input text-right text-[0.88rem] tabular-nums"
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
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--vd-border)] text-[color:var(--vd-muted)]"
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
            className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2 text-[0.8rem] font-medium text-[color:var(--vd-text)]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Position hinzufügen
          </PressableButton>

          {error ? (
            <p className="text-[0.82rem] text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {!inline ? (
            <div className="flex gap-2 pt-1">
              <PressableButton
                type="button"
                variant="button"
                disabled={pending}
                onClick={cancelEdit}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-[color:var(--vd-border)] px-3 py-2.5 text-[0.85rem] font-medium text-[color:var(--vd-text)]"
              >
                Abbrechen
              </PressableButton>
              <PressableButton
                type="button"
                variant="button"
                disabled={pending}
                onClick={commit}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-neutral-900 px-3 py-2.5 text-[0.85rem] font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Speichern…" : "Übernehmen"}
              </PressableButton>
            </div>
          ) : null}
        </div>
      ) : displayItems.length === 0 ? (
        <p className="text-[0.88rem] text-[color:var(--vd-muted)]">{emptyHint}</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-[color:var(--vd-border)]">
          {displayItems.map((item, index) => (
            <li
              key={`${item.label}-${index}`}
              className={[
                "flex items-start justify-between gap-3 px-3 py-2.5 text-[0.88rem]",
                zebraRowClass(index),
                index > 0 ? "border-t border-[color:var(--vd-border)]/60" : "",
              ].join(" ")}
            >
              <span className="whitespace-pre-line text-[color:var(--vd-text)]">
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums text-[color:var(--vd-text)]">
                {formatEur(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!editing && totalAmount !== null ? (
        <div className="mt-5 flex items-center justify-between border-t border-[color:var(--vd-border)] pt-3">
          <span className="text-[0.95rem] font-bold tracking-[-0.02em] text-[color:var(--vd-text)]">
            Gesamt
          </span>
          <span className="text-[1.05rem] font-bold tracking-[-0.02em] tabular-nums text-[color:var(--vd-text)]">
            {formatEur(totalAmount)}
          </span>
        </div>
      ) : null}
    </section>
  );
}
