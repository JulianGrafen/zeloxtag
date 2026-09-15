"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Building2, Pencil } from "lucide-react";

import { updateManualOilChangeFields } from "@/actions/update-manual-oil-change-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { isOilChangeSelfMadeVendor } from "@/lib/documents/oil-changes";
import type { OilDetailEditTarget } from "@/lib/documents/oil-detail-edit";

const EDIT_TARGET: OilDetailEditTarget = "vendor";

type EditableOilChangeVendorSectionProps = {
  documentId: string;
  vehicleId: string;
  tagUuid: string;
  workshop: string | null;
  selfMade: boolean;
  vendorDraft: string;
  onSaved?: (workshop: string | null, selfMade: boolean) => void;
  hideEditTrigger?: boolean;
  editRequest?: OilDetailEditTarget | null;
  editPulse?: number;
  onEditRequestConsumed?: () => void;
  sectionId?: string;
};

export function EditableOilChangeVendorSection({
  documentId,
  vehicleId,
  tagUuid,
  workshop,
  selfMade: storedSelfMade,
  vendorDraft: storedVendorDraft,
  onSaved,
  hideEditTrigger = false,
  editRequest = null,
  editPulse = 0,
  onEditRequestConsumed,
  sectionId,
}: EditableOilChangeVendorSectionProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selfMade, setSelfMade] = useState(storedSelfMade);
  const [vendor, setVendor] = useState(storedVendorDraft);
  const [displayWorkshop, setDisplayWorkshop] = useState(workshop);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setSelfMade(storedSelfMade);
      setVendor(storedVendorDraft);
      setDisplayWorkshop(workshop);
    }
  }, [storedSelfMade, storedVendorDraft, workshop, editing]);

  useEffect(() => {
    if (editRequest !== EDIT_TARGET || editPulse === 0) return;
    setError(null);
    setEditing(true);
    onEditRequestConsumed?.();
  }, [editRequest, editPulse, onEditRequestConsumed]);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateManualOilChangeFields({
        documentId,
        vehicleId,
        tagUuid,
        patch: { selfMade, vendor: selfMade ? "" : vendor },
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      const nextWorkshop = selfMade
        ? "Selbst gemacht"
        : vendor.trim() || null;
      setDisplayWorkshop(nextWorkshop);
      onSaved?.(nextWorkshop, selfMade);
      setEditing(false);
      router.refresh();
    });
  }

  const label = isOilChangeSelfMadeVendor(displayWorkshop)
    ? "Durchführung"
    : "Werkstatt";

  return (
    <div
      id={sectionId}
      className="scroll-mt-24 flex justify-between gap-3 border-t border-[color:var(--vd-border)]/60 pt-3 first:border-t-0 first:pt-0"
    >
      {!editing ? (
        <>
          <dt className="text-[color:var(--vd-muted)]">{label}</dt>
          <dd className="max-w-[60%] text-right font-medium text-[color:var(--vd-text)]">
            <span className="inline-flex items-center gap-2">
              {displayWorkshop ?? "—"}
              {!hideEditTrigger ? (
                <PressableButton
                  type="button"
                  variant="button"
                  onClick={() => setEditing(true)}
                  aria-label="Werkstatt bearbeiten"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--vd-border)]"
                >
                  <Pencil className="h-3 w-3" aria-hidden />
                </PressableButton>
              ) : null}
            </span>
          </dd>
        </>
      ) : (
        <div className="col-span-2 w-full space-y-3">
          <label className="flex items-center gap-2 text-[0.88rem]">
            <input
              type="checkbox"
              checked={selfMade}
              onChange={(event) => setSelfMade(event.target.checked)}
            />
            Selbst gemacht
          </label>
          {!selfMade ? (
            <Label>
              <span className="sr-only">Werkstatt</span>
              <Input
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
                placeholder="Werkstatt"
                maxLength={160}
              />
            </Label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={handleSave}
              className="rounded-xl bg-neutral-900 px-3.5 py-2 text-[0.8rem] font-semibold text-white"
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
            <PressableButton
              type="button"
              variant="button"
              disabled={pending}
              onClick={() => setEditing(false)}
              className="rounded-xl border px-3.5 py-2 text-[0.8rem]"
            >
              Abbrechen
            </PressableButton>
          </div>
          {error ? (
            <p role="alert" className="text-[0.78rem] text-red-700">{error}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
