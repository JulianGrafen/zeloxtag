"use client";

import { useTransition } from "react";

import {
  signInWithGoogle,
  type AuthActionResult,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

import { GoogleIcon } from "./google-icon";

interface OAuthSignInButtonsProps {
  nextPath?: string;
  onError?: (message: string) => void;
}

function handleOAuthResult(
  result: AuthActionResult,
  onError?: (message: string) => void,
): void {
  if (result.status === "oauth_redirect" && result.url) {
    window.location.assign(result.url);
    return;
  }
  if (result.status === "rate_limited") {
    onError?.(
      `Zu viele Versuche. Bitte in ${result.retryAfterSec}s erneut versuchen.`,
    );
    return;
  }
  if (result.status === "unconfigured") {
    onError?.(
      "Supabase ist nicht konfiguriert. Setze NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return;
  }
  if (result.status === "error") {
    onError?.(result.message);
  }
}

export function OAuthSignInButtons({
  nextPath = "/auth/continue",
  onError,
}: OAuthSignInButtonsProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={pending}
      className="min-h-11 w-full bg-background text-foreground"
      onClick={() => {
        startTransition(async () => {
          handleOAuthResult(await signInWithGoogle(nextPath), onError);
        });
      }}
    >
      <GoogleIcon className="h-5 w-5" />
      {pending ? "Weiter zu Google…" : "Mit Google fortfahren"}
    </Button>
  );
}
