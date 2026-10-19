"use client";

import { useTransition } from "react";

import { GoogleGIcon } from "@/components/auth/icons/google-g-icon";
import { Button } from "@/components/ui/button";
import {
  OAUTH_PROVIDERS,
  oauthProviderLabel,
  oauthStartPath,
  type OAuthProvider,
} from "@/lib/auth/oauth-providers";
import { cn } from "@/lib/utils";

type OAuthProviderButtonsProps = {
  nextPath?: string;
  disabled?: boolean;
  className?: string;
  /** Defaults to all configured providers. */
  providers?: readonly OAuthProvider[];
  /** Return false to abort redirect (e.g. pending garage staging failed). */
  beforeRedirect?: (provider: OAuthProvider) => Promise<boolean | void>;
};

function OAuthProviderIcon({
  provider,
  className,
}: {
  provider: OAuthProvider;
  className?: string;
}) {
  if (provider === "google") {
    return <GoogleGIcon className={className} />;
  }
  return null;
}

export function OAuthProviderButtons({
  nextPath = "/auth/continue",
  disabled = false,
  className,
  providers = OAUTH_PROVIDERS,
  beforeRedirect,
}: OAuthProviderButtonsProps) {
  const [pending, startTransition] = useTransition();

  function handleClick(provider: OAuthProvider) {
    startTransition(async () => {
      if (beforeRedirect) {
        const allowed = await beforeRedirect(provider);
        if (allowed === false) return;
      }
      window.location.assign(oauthStartPath(provider, nextPath));
    });
  }

  return (
    <div className={cn("grid w-full gap-2", className)}>
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          className={cn(
            "min-h-11 w-full justify-center gap-2.5 border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] font-medium text-[color:var(--vd-text)] shadow-none hover:bg-[color:var(--vd-surface)]",
            provider === "google" && "bg-white hover:bg-neutral-50",
          )}
          disabled={disabled || pending}
          onClick={() => handleClick(provider)}
        >
          <OAuthProviderIcon provider={provider} className="h-5 w-5 shrink-0" />
          <span>
            {pending ? "Weiter…" : `Mit ${oauthProviderLabel(provider)} fortfahren`}
          </span>
        </Button>
      ))}
    </div>
  );
}

export function OAuthDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center py-1 text-center text-[0.72rem] text-muted-foreground",
        className,
      )}
    >
      <span className="flex-1 border-t border-[color:var(--vd-border)]" aria-hidden />
      <span className="px-3">oder</span>
      <span className="flex-1 border-t border-[color:var(--vd-border)]" aria-hidden />
    </div>
  );
}
