"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type GenerateExposeDialogProps = {
  open: boolean;
  vehicleLabel: string;
  /** When true, profile has finances hidden — default export checkbox off. */
  profileHidesFinancials: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (includeFinancials: boolean) => void;
};

export function GenerateExposeDialog({
  open,
  vehicleLabel,
  profileHidesFinancials,
  loading,
  onClose,
  onConfirm,
}: GenerateExposeDialogProps) {
  const [includeFinancials, setIncludeFinancials] = useState(
    !profileHidesFinancials,
  );

  useEffect(() => {
    if (open) {
      setIncludeFinancials(!profileHidesFinancials);
    }
  }, [open, profileHidesFinancials]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expose-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Schließen"
        onClick={() => {
          if (!loading) onClose();
        }}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-[1.35rem] border border-[color:var(--vd-border)]",
          "bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-modal)]",
        )}
      >
        <h2
          id="expose-dialog-title"
          className="text-[1.05rem] font-semibold text-[color:var(--vd-text)]"
        >
          PDF-Exposé erstellen
        </h2>
        <p className="mt-2 text-[0.84rem] leading-relaxed text-[color:var(--vd-muted)]">
          Druckfertiges Verkaufs-Exposé für {vehicleLabel}: Historie, Umbauten
          und QR-Link zum ZeloxTag-Profil.
        </p>

        <label
          className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-3"
        >
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--vd-text)]"
            checked={includeFinancials}
            disabled={loading}
            onChange={(event) => setIncludeFinancials(event.target.checked)}
          />
          <span className="flex flex-col gap-1">
            <Label className="text-[0.88rem] font-medium text-[color:var(--vd-text)]">
              Kosten & Gesamtsummen im PDF anzeigen
            </Label>
            <span className="text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
              Beträge pro Wartung und Umbau sowie dokumentierte Gesamtkosten.
              Du kannst sie weglassen — z. B. für Privatverkauf ohne
              Preisnennung.
            </span>
          </span>
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={loading}
            onClick={onClose}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={loading}
            onClick={() => onConfirm(includeFinancials)}
          >
            {loading ? "Exposé wird erstellt…" : "PDF erstellen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
