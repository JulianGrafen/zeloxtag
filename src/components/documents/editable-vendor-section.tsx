"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Building2, Pencil } from "lucide-react";

import { updateDocumentFields } from "@/actions/update-document-fields";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditableVendorSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  vendor: string | null;
  label?: string;
  placeholder?: string;
  onSaved?: (vendor: string | null) => void;
};

/**
 * Owner (or Schrauber on invoices): edit workshop / vendor name after upload.
 */
export function EditableVendorSection({
  documentId,
  vehicleId,
  tagUuid,
  vendor,
  label = "Werkstatt",
  placeholder = "z. B. Auto Meister GmbH",
  onSaved,
}: EditableVendorSectionProps) {
  const router = useRouter();
  const storedVendor = vendor?.trim() || null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(storedVendor ?? "");
  const [displayVendor, setDisplayVendor] = useState(storedVendor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setDisplayVendor(storedVendor);
      setDraft(storedVendor ?? "");
    }
  }, [storedVendor, editing]);

  function handleCancel() {
    setDraft(storedVendor ?? "");
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    setError(null);
    const nextVendor = draft.trim() || null;
    startTransition(async () => {
      const result = await updateDocumentFields({
        documentId,
        vehicleId,
        tagUuid,
        vendor: nextVendor,
      });
      if (isActionFailure(result)) {
        setError(result.message);
        return;
      }
      setDisplayVendor(nextVendor);
      onSaved?.(nextVendor);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
          {label}
        </p>
        {!editing ? (
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-2.5 py-1 text-[0.72rem] font-medium text-[color:var(--vd-text)]"
          >
            <Pencil className="h-3 w-3" aria-hidden />
            Bearbeiten
          </PressableButton>
        ) : null}
      </div>

      {!editing ? (
        <div className="flex items-start gap-2.5">
          <Building2
            className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
            aria-hidden
          />
          <p className="text-[0.92rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
            {displayVendor ?? "—"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Label>
            <span className="sr-only">{label}</span>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={placeholder}
              className="mt-0"
              maxLength={160}
            />
          </Label>
          <div className="flex flex-wrap gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-3.5 py-2 text-[0.8rem] font-semibold text-white"
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleCancel}
              className="inline-flex items-center justify-center rounded-xl border border-[color:var(--vd-border)] px-3.5 py-2 text-[0.8rem] font-medium text-[color:var(--vd-text)]"
            >
              Abbrechen
            </PressableButton>
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[0.78rem] text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
