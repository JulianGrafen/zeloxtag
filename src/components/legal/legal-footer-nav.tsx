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

  return (
    <nav
      aria-label="Rechtliches"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[0.72rem]",
        className,
      )}
    >
      <Link href="/impressum" className={linkClass}>
        Impressum
      </Link>
      <Link href="/agb" className={linkClass}>
        AGB
      </Link>
      <Link href="/datenschutz" className={linkClass}>
        Datenschutzerklärung
      </Link>
    </nav>
  );
}
