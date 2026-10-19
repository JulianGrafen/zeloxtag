"use client";

import { OAuthProviderButtons } from "@/components/auth/oauth-provider-buttons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIGNUP_NEXT = "/onboarding/fahrzeug";

type PublicSwipeConversionGateProps = {
  open: boolean;
  onClose?: () => void;
};

export function PublicSwipeConversionGate({
  open,
  onClose,
}: PublicSwipeConversionGateProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-swipe-gate-title"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
        aria-hidden
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-white/15",
          "bg-black/60 p-6 shadow-2xl backdrop-blur-xl backdrop-saturate-150",
        )}
      >
        <h2
          id="public-swipe-gate-title"
          className="text-balance font-[family-name:var(--font-display)] text-xl font-bold tracking-[-0.02em] text-white"
        >
          Du hast Geschmack. Aber was steht in deiner Garage?
        </h2>
        <ul className="mt-4 space-y-2 text-[0.9rem] leading-snug text-white/88">
          <li>Auto hochladen &amp; bewerten lassen</li>
          <li>Alle Spec-Sheets sehen</li>
          <li>Unbegrenzt swipen</li>
        </ul>

        <div className="mt-6 space-y-2">
          <OAuthProviderButtons
            nextPath={SIGNUP_NEXT}
            providers={["google"] as const}
          />
        </div>

        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full text-white/70 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            Später
          </Button>
        ) : null}
      </div>
    </div>
  );
}
