"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  NotebookPen,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";

import { createManualVehicleEntry } from "@/actions/create-manual-entry";
import { deleteDocument } from "@/actions/delete-document";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import {
  displayDocumentTitle,
  formatDocumentAmount,
  formatDocumentDate,
} from "@/lib/documents/format";
import {
  filterManualVehicleEntries,
  MANUAL_ENTRY_CATEGORIES,
  MANUAL_ENTRY_CATEGORY_LABELS,
  type ManualEntryCategory,
} from "@/lib/documents/manual-entries";
import type { Document } from "@/types/database";

interface ManualEntryViewProps {
  tagUuid: string;
  vehicleId: string;
  vehicleLabel: string;
  documents: Document[];
}

export function ManualEntryView({
  tagUuid,
  vehicleId,
  vehicleLabel,
  documents,
}: ManualEntryViewProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ManualEntryCategory>("service");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const entries = filterManualVehicleEntries(documents);

  function resetForm() {
    setTitle("");
    setDate("");
    setAmount("");
    setVendor("");
    setMileageKm("");
    setNotes("");
    setCategory("service");
    setError(null);
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createManualVehicleEntry({
        vehicleId,
        tagUuid,
        category,
        title:
          title.trim() ||
          (category === "tuning" ? "Tuning-Eintrag" : "Wartungseintrag"),
        date,
        amount,
        vendor,
        mileageKm,
        notes,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      resetForm();
      setShowForm(false);
      router.refresh();
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
              Ohne Beleg
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
              Wartung & Tuning
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleLabel} · eigene Einträge ohne Scan
            </p>
          </div>
        </header>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
          >
            {error}
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

            <div className="flex gap-2 pt-1">
              <PressableButton
                type="button"
                variant="button"
                disabled={pending}
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
                disabled={pending || title.trim().length < 2}
                className="claim-cta flex-1 disabled:opacity-60"
              >
                {pending ? "Speichern…" : "Eintrag speichern"}
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
                Trage Wartungen oder Tuning-Arbeiten ein, für die du keinen
                Beleg scannen willst.
              </p>
            </div>
          ) : (
            <ul className="vd-anim-list overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
              {entries.map((doc) => {
                const kind =
                  doc.category === "tuning"
                    ? MANUAL_ENTRY_CATEGORY_LABELS.tuning
                    : MANUAL_ENTRY_CATEGORY_LABELS.service;
                const amountLabel = formatDocumentAmount(doc.amount);
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
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                        <NotebookPen className="h-5 w-5" aria-hidden />
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
