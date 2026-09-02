"use client";

import { Sparkles, X } from "lucide-react";

import { StripeCheckoutButton } from "@/components/billing/stripe-checkout-button";
import { proCheckoutButtonLabel } from "@/lib/billing/pro-plan";

export function FreeScanSuccessModal({
  open,
  tagUuid,
  onClose,
}: {
  open: boolean;
  tagUuid: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      style={{ background: "var(--vd-overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-scan-success-title"
    >
      <button
        type="button"
        aria-label="Schließen"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="vd-surface-card relative z-10 w-full max-w-md p-5 shadow-[var(--vd-shadow-modal)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-emerald-900">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Gratis-Scan genutzt
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--vd-muted)] transition hover:bg-black/5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <h2
          id="free-scan-success-title"
          className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
        >
          Dokument gespeichert — KI hat alles erkannt
        </h2>
        <p className="claim-copy mt-2 text-[0.88rem]">
          Dein kostenloser KI-Scan liegt jetzt in der Akte. Für weitere Belege,
          ABEs, TÜV und die volle Dokumentenakte: ZeloxTag Pro — die ersten 14
          Tage sind kostenlos.
        </p>
        <StripeCheckoutButton
          successPath={`/v/${tagUuid}`}
          cancelPath={`/v/${tagUuid}/abo`}
          label={proCheckoutButtonLabel("new")}
        />
        <button
          type="button"
          onClick={onClose}
          className="claim-later mt-2 w-full rounded-xl px-3 py-2.5"
        >
          Später — zurück zum Dashboard
        </button>
      </div>
    </div>
  );
}
