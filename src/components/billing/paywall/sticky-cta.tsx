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
  const inline = !fixed;

  return (
    <div
      className={cn(
        "z-20 px-4",
        inline
          ? "shrink-0 bg-[color:var(--vd-surface)]/95 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl"
          : "fixed inset-x-0 bottom-0 border-t border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto w-full max-w-lg">
        <Button
          type="button"
          className={cn(
            "paywall-cta-pulse w-full font-semibold",
            inline ? "h-11 text-[0.9rem]" : "h-12 text-[0.95rem]",
          )}
          disabled={pending}
          onClick={onCheckout}
        >
          {pending ? "Weiter zu Stripe…" : label}
        </Button>
        {microCopy ? (
          <p
            className={cn(
              "text-center leading-snug text-[color:var(--vd-muted)]",
              inline ? "mt-1.5 text-[0.68rem]" : "mt-2 text-[0.72rem] leading-relaxed",
            )}
          >
            {microCopy}
          </p>
        ) : null}
        {error ? (
          <p
            className={cn(
              "text-center text-red-700",
              inline ? "mt-1 text-[0.68rem]" : "mt-2 text-[0.74rem]",
            )}
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {dismissLabel && onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              "claim-later w-full rounded-xl px-3",
              inline ? "mt-1 py-1.5 text-[0.76rem]" : "mt-2 py-2 text-[0.84rem]",
            )}
          >
            {dismissLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
