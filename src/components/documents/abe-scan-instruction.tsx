"use client";

import { ArrowLeft, Camera, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";

export interface AbeScanInstructionProps {
  stepNumber: number;
  totalSteps?: number;
  title: string;
  hint: string;
  guideLabel: string;
  vehicleLabel: string;
  onStart: () => void;
  onBack: () => void;
  backHref?: string;
  backLabel?: string;
}

/**
 * ABE-only scan briefing shown on the light dashboard surface before the
 * fullscreen camera opens. Keeps step instructions unmistakably visible.
 */
export function AbeScanInstruction({
  stepNumber,
  totalSteps = 3,
  title,
  hint,
  guideLabel,
  vehicleLabel,
  onStart,
  onBack,
  backHref,
  backLabel = "Zurück",
}: AbeScanInstructionProps) {
  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-6 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="space-y-4">
        {backHref ? (
          <PressableLink
            href={backHref}
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </PressableLink>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </button>
        )}

        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <ScanLine className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            ABE scannen · Schritt {stepNumber} von {totalSteps}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            {title}
          </h1>
          <p className="mt-1 text-[0.88rem] text-[color:var(--vd-muted)]">
            {vehicleLabel}
          </p>
        </div>
      </header>

      <div
        role="note"
        className="rounded-[1.35rem] border border-amber-300/70 bg-amber-50 px-4 py-4 text-[0.92rem] leading-relaxed text-amber-950 shadow-[var(--vd-shadow-sm)]"
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-800">
          Scan-Hinweis
        </p>
        <p className="mt-2 font-semibold tracking-[-0.01em]">{hint}</p>
        <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[0.84rem] font-medium text-amber-950">
          Im Kamera-Rahmen: {guideLabel}
        </p>
      </div>

      <div className="mt-auto space-y-3">
        <Button
          type="button"
          onClick={onStart}
          className="claim-cta h-12 w-full gap-2 text-[0.95rem]"
        >
          <Camera className="h-4 w-4" aria-hidden />
          Jetzt fotografieren
        </Button>
        <p className="text-center text-[0.76rem] text-[color:var(--vd-muted)]">
          Du kannst alternativ in der Kamera ein Bild aus der Galerie wählen.
        </p>
      </div>
    </section>
  );
}
