"use client";

import { useTransition } from "react";

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
  /** Return false to abort redirect (e.g. pending garage staging failed). */
  beforeRedirect?: (provider: OAuthProvider) => Promise<boolean | void>;
};

export function OAuthProviderButtons({
  nextPath = "/auth/continue",
  disabled = false,
  className,
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
      {OAUTH_PROVIDERS.map((provider) => (
        <Button
          key={provider}
          type="button"
          variant="outline"
          className="min-h-11 w-full justify-center gap-2 font-medium"
          disabled={disabled || pending}
          onClick={() => handleClick(provider)}
        >
          {pending ? "Weiter…" : `Mit ${oauthProviderLabel(provider)} fortfahren`}
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
