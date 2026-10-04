"use client";

import { useEffect, useState } from "react";

import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { PlannedModWithTodos } from "@/lib/build-planner/types";

type CompletePlannedModSheetProps = {
  open: boolean;
  mod: PlannedModWithTodos | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (showOnPublicShowcase: boolean) => void;
};

export function CompletePlannedModSheet({
  open,
  mod,
  pending,
  onClose,
  onConfirm,
}: CompletePlannedModSheetProps) {
  const [showcase, setShowcase] = useState(false);

  useEffect(() => {
    if (open) setShowcase(false);
  }, [open]);

  if (!open || !mod) return null;

  const doneCount = mod.todos.filter((t) => t.status === "done").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-build-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-5 shadow-xl">
        <h2
          id="complete-build-title"
          className="text-[1.05rem] font-semibold text-[color:var(--vd-text)]"
        >
          In Garage übernehmen?
        </h2>
        <p className="mt-2 text-[0.85rem] text-[color:var(--vd-muted)]">
          {mod.title}
          {mod.planned_price_eur != null
            ? ` · ${formatEur(mod.planned_price_eur)}`
            : ""}
          · {doneCount} Schritte erledigt
        </p>

        <label className="mt-4 flex min-h-[44px] items-start gap-3 rounded-xl border border-[color:var(--vd-border)] px-3 py-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-[color:var(--vd-text)]"
            checked={showcase}
            onChange={(e) => setShowcase(e.target.checked)}
          />
          <span className="text-[0.85rem] text-[color:var(--vd-text)]">
            Im öffentlichen Showcase anzeigen
            <span className="mt-0.5 block text-[0.75rem] text-[color:var(--vd-muted)]">
              Standard ist privat — nur in deiner Akte sichtbar.
            </span>
          </span>
        </label>

        <div className="mt-5 flex gap-2">
          <PressableButton
            type="button"
            className="flex-1 rounded-xl border border-[color:var(--vd-border)] py-3 text-[0.88rem] font-medium"
            disabled={pending}
            onClick={onClose}
          >
            Abbrechen
          </PressableButton>
          <PressableButton
            type="button"
            className="flex-1 rounded-xl bg-[color:var(--vd-text)] py-3 text-[0.88rem] font-semibold text-[color:var(--vd-bg)]"
            disabled={pending}
            onClick={() => onConfirm(showcase)}
          >
            Übernehmen
          </PressableButton>
        </div>
      </div>
    </div>
  );
}
