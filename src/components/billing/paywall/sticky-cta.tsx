"use client";

import {
  PRO_PAYWALL_STICKY_MICROCOPY,
  proCheckoutButtonLabel,
} from "@/lib/billing/pro-plan";
import { automotiveBottomBarShellClassName } from "@/components/ui/automotive";
import { cn } from "@/lib/utils";

export function StickyPaywallCta({
  label = proCheckoutButtonLabel("new", "annual"),
  microCopy = PRO_PAYWALL_STICKY_MICROCOPY,
  anchorText,
  pending,
  pendingLabel = "Weiter zu Stripe…",
  error,
  dismissLabel,
  onCheckout,
  onDismiss,
  fixed = true,
}: {
  label?: string;
  microCopy?: string;
  anchorText?: string;
  pending: boolean;
  pendingLabel?: string;
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
        fixed
          ? cn(
              "fixed inset-x-0 bottom-0 z-[110]",
              automotiveBottomBarShellClassName,
            )
          : cn(
              "paywall-sticky-footer z-20 shrink-0 border-t border-[color:var(--paywall-grouped-separator)] bg-[color:var(--paywall-sheet-bg)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
            ),
      )}
    >
      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          className={cn(
            "claim-cta paywall-sticky-cta paywall-apple-cta w-full",
            inline && "paywall-sticky-cta--inline",
          )}
          disabled={pending}
          onClick={onCheckout}
        >
          {pending ? pendingLabel : label}
        </button>
        {microCopy?.trim() ? (
          <p
            className={cn(
              "text-center leading-snug text-[color:var(--vd-muted)]",
              inline ? "mt-2 text-[12px]" : "mt-2 text-[13px] leading-snug",
            )}
          >
            {microCopy}
          </p>
        ) : null}
        {anchorText?.trim() ? (
          <p
            className={cn(
              "text-center leading-snug text-[color:var(--vd-muted)]",
              inline ? "mt-2 text-[12px]" : "mt-2.5 text-[13px] leading-snug",
            )}
          >
            {anchorText}
          </p>
        ) : null}
        {error ? (
          <p
            className={cn(
              "text-center text-[color:var(--vd-alert-error-text)]",
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
              "paywall-dismiss claim-later w-full rounded-xl px-3 font-normal",
              inline ? "mt-2 py-2 text-[15px]" : "mt-2 py-2.5 text-[15px]",
            )}
          >
            {dismissLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
