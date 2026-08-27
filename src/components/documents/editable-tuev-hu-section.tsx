"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarClock, Pencil } from "lucide-react";

import { updateTuevApprovalFields } from "@/actions/update-tuev-approval-fields";
import { GermanDateInput } from "@/components/documents/german-date-input";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { Label } from "@/components/ui/label";
import {
  formatTuevYearMonth,
  isoDateToYearMonth,
  yearMonthToIsoDate,
} from "@/lib/documents/format";
import type { ApprovalFields } from "@/lib/documents/approval-fields";

type EditableTuevHuSectionProps = {
  approvalFields: Extract<ApprovalFields, { kind: "tuev" }>;
  documentId: string;
  vehicleId: string;
  tagUuid: string;
};

/**
 * Owner-editable next HU month on saved TÜV documents.
 */
export function EditableTuevHuSection({
  approvalFields,
  documentId,
  vehicleId,
  tagUuid,
}: EditableTuevHuSectionProps) {
  const storedMonth = approvalFields.data.nextInspectionDate;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(storedMonth ?? "");
  const [displayMonth, setDisplayMonth] = useState(storedMonth);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayMonth(storedMonth);
      setDraft(storedMonth ?? "");
    }
  }, [storedMonth, editing]);

  function handleCancel() {
    setDraft(storedMonth ?? "");
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateTuevApprovalFields({
        documentId,
        vehicleId,
        tagUuid,
        nextInspectionDate: draft.trim() || null,
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setDisplayMonth(draft.trim() || null);
      setEditing(false);
    });
  }

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
          Nächste HU
        </h2>
        {!editing ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-1.5 text-[0.75rem] font-medium text-[color:var(--vd-text)]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Bearbeiten
          </PressableButton>
        ) : null}
      </div>

      {!editing ? (
        <div className="flex items-start gap-3 rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
          <CalendarClock
            className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--vd-muted)]"
            aria-hidden
          />
          <div>
            <p className="text-[0.7rem] text-[color:var(--vd-muted)]">
              Fälligkeit Hauptuntersuchung
            </p>
            <p className="mt-0.5 text-[1.05rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
              {formatTuevYearMonth(displayMonth)}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Label>
            <span className="text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
              Fällig am
            </span>
            <GermanDateInput
              value={yearMonthToIsoDate(draft)}
              onChange={(iso) => setDraft(isoDateToYearMonth(iso) ?? "")}
              className="mt-1.5"
            />
          </Label>
          <div className="flex flex-wrap gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-[0.82rem] font-semibold text-white"
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--vd-border)] px-4 py-2.5 text-[0.82rem] font-medium text-[color:var(--vd-text)]"
            >
              Abbrechen
            </PressableButton>
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
