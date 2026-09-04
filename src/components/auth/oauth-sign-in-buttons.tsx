import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { GoogleIcon } from "./google-icon";

interface OAuthSignInButtonsProps {
  nextPath?: string;
}

export function OAuthSignInButtons({
  nextPath = "/auth/continue",
}: OAuthSignInButtonsProps) {
  const googleLoginHref = `/auth/login/google?next=${encodeURIComponent(nextPath)}`;

  return (
    <Link
      href={googleLoginHref}
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        "inline-flex min-h-11 w-full items-center justify-center gap-2 bg-background text-foreground",
      )}
    >
      <GoogleIcon className="h-5 w-5 shrink-0" />
      <span>Mit Google fortfahren</span>
    </Link>
  );
}
