"use client";

import { Camera, ScanLine, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { useFuelFillCapture } from "@/hooks/use-fuel-fill-capture";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

import { FuelFillFormFields } from "./fuel-fill-form-fields";

type FuelFillCaptureSheetProps = {
  open: boolean;
  onClose: () => void;
  tagUuid: string;
  vehicleId: string;
  onSaved?: () => void;
};

export function FuelFillCaptureSheet({
  open,
  onClose,
  tagUuid,
  vehicleId,
  onSaved,
}: FuelFillCaptureSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const {
    form,
    setForm,
    scanError,
    submitError,
    pending,
    scanReceipt,
    submit,
    isScanning,
  } = useFuelFillCapture({
    tagUuid,
    vehicleId,
    open,
    onSaved: () => {
      onSaved?.();
      onClose();
    },
  });

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-neutral-950/55 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fuel-fill-sheet-title"
      aria-busy={isScanning}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow)] sm:rounded-[1.5rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-[color:var(--vd-border)] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
              Tanken
            </p>
            <h2
              id="fuel-fill-sheet-title"
              className="mt-1 font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
            >
              Tankvorgang hinzufügen
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-muted)]"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void scanReceipt(file);
            }}
          />

          <PressableButton
            type="button"
            disabled={isScanning || pending}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[color:var(--vd-accent)]/40 bg-[color:var(--vd-surface-elevated)] px-4 py-3.5 text-[0.92rem] font-semibold text-[color:var(--vd-text)] shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--vd-accent)_35%,transparent)]"
            onClick={() => fileInputRef.current?.click()}
          >
            <ScanLine className="h-5 w-5 text-[color:var(--vd-accent)]" aria-hidden />
            Beleg scannen
          </PressableButton>

          {isScanning ? (
            <div className="space-y-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]/60 p-4">
              <p className="flex items-center gap-2 text-[0.85rem] font-medium text-[color:var(--vd-muted)]">
                <Camera className="h-4 w-4 animate-pulse" aria-hidden />
                Analysiere Beleg…
              </p>
              <div className="space-y-2">
                <div className="h-2 animate-pulse rounded-full bg-[color:var(--vd-border)]" />
                <div className="h-2 w-4/5 animate-pulse rounded-full bg-[color:var(--vd-border)]" />
                <div className="h-2 w-3/5 animate-pulse rounded-full bg-[color:var(--vd-border)]" />
              </div>
            </div>
          ) : null}

          {scanError ? (
            <p className="text-[0.82rem] text-amber-600" role="status">
              {scanError} — Felder kannst du manuell ausfüllen.
            </p>
          ) : null}

          <FuelFillFormFields
            value={form}
            onChange={setForm}
            disabled={isScanning || pending}
          />

          {submitError ? (
            <p className="text-sm text-red-600" role="alert">{submitError}</p>
          ) : null}
        </div>

        <footer className="flex gap-2 border-t border-[color:var(--vd-border)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <PressableButton
            type="button"
            className="flex-1 rounded-2xl border border-[color:var(--vd-border)] py-3 text-[0.88rem] font-semibold text-[color:var(--vd-text)]"
            onClick={onClose}
            disabled={pending}
          >
            Abbrechen
          </PressableButton>
          <PressableButton
            type="button"
            disabled={pending || isScanning}
            className="flex-1 rounded-2xl bg-neutral-950 py-3 text-[0.88rem] font-semibold text-white hover:bg-neutral-900"
            onClick={submit}
          >
            {pending ? "Speichern…" : "Speichern"}
          </PressableButton>
        </footer>
      </div>
    </div>
  );
}
