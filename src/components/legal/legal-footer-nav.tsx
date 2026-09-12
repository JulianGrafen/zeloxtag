import Link from "next/link";

import { cn } from "@/lib/utils";

type LegalFooterNavProps = {
  className?: string;
  /** Muted links on dark showcase surfaces */
  tone?: "default" | "inverse";
};

export function LegalFooterNav({
  className,
  tone = "default",
}: LegalFooterNavProps) {
  const linkClass =
    tone === "inverse"
      ? "text-white/45 underline-offset-2 hover:text-white/70 hover:underline"
      : "text-[color:var(--vd-muted)] underline-offset-2 hover:underline";

  const linkLayout =
    "relative z-10 inline-flex min-h-9 items-center px-1 pointer-events-auto";

  return (
    <nav
      aria-label="Rechtliches"
      className={cn(
        "relative z-20 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[0.72rem] pointer-events-auto",
        className,
      )}
    >
      <Link href="/impressum" className={cn(linkLayout, linkClass)}>
        Impressum
      </Link>
      <Link href="/agb" className={cn(linkLayout, linkClass)}>
        AGB
      </Link>
      <Link href="/datenschutz" className={cn(linkLayout, linkClass)}>
        Datenschutzerklärung
      </Link>
    </nav>
  );
}
