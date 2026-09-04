"use client";

import { Button } from "@/components/ui/button";
import {
  PRO_PAYWALL_STICKY_MICROCOPY,
  PRO_TRIAL_LABEL,
} from "@/lib/billing/pro-plan";
import { cn } from "@/lib/utils";

export function StickyPaywallCta({
  label = PRO_TRIAL_LABEL,
  microCopy = PRO_PAYWALL_STICKY_MICROCOPY,
  pending,
  error,
  dismissLabel,
  onCheckout,
  onDismiss,
  fixed = true,
}: {
  label?: string;
  microCopy?: string;
  pending: boolean;
  error: string | null;
  dismissLabel?: string;
  onCheckout: () => void;
  onDismiss?: () => void;
  fixed?: boolean;
}) {
  return (
    <div
      className={cn(
        "z-20 border-t border-[color:var(--vd-border)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]",
        fixed
          ? "fixed inset-x-0 bottom-0 bg-[color:var(--vd-surface)]/95 backdrop-blur-xl"
          : "mt-6 shrink-0 rounded-2xl border bg-[color:var(--vd-surface)]/95 shadow-[var(--vd-shadow-sm)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto w-full max-w-lg">
        <Button
          type="button"
          className="paywall-cta-pulse h-12 w-full text-[0.95rem] font-semibold"
          disabled={pending}
          onClick={onCheckout}
        >
          {pending ? "Weiter zu Stripe…" : label}
        </Button>
        <p className="mt-2 text-center text-[0.72rem] leading-relaxed text-[color:var(--vd-muted)]">
          {microCopy}
        </p>
        {error ? (
          <p className="mt-2 text-center text-[0.74rem] text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {dismissLabel && onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="claim-later mt-2 w-full rounded-xl px-3 py-2 text-[0.84rem]"
          >
            {dismissLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
