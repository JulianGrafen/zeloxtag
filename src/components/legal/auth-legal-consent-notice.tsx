import Link from "next/link";

import { cn } from "@/lib/utils";

const linkClassName =
  "font-medium text-[color:var(--vd-text)] underline-offset-4 hover:underline";

type AuthLegalConsentNoticeProps = {
  variant: "signup" | "claim";
  className?: string;
};

export function AuthLegalConsentNotice({
  variant,
  className,
}: AuthLegalConsentNoticeProps) {
  if (variant === "claim") {
    return (
      <p
        className={cn(
          "text-xs leading-relaxed text-muted-foreground",
          className,
        )}
      >
        Mit dem Anlegen deines Kontos stimmst du der{" "}
        <Link href="/datenschutz" className={linkClassName}>
          Datenschutzerklärung
        </Link>{" "}
        und den{" "}
        <Link href="/agb" className={linkClassName}>
          AGB
        </Link>{" "}
        zu.
      </p>
    );
  }

  return (
    <p
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
    >
      Mit „Konto erstellen“ akzeptierst du die{" "}
      <Link href="/agb" className={linkClassName}>
        AGB
      </Link>{" "}
      und die{" "}
      <Link href="/datenschutz" className={linkClassName}>
        Datenschutzerklärung
      </Link>
      .
    </p>
  );
}
