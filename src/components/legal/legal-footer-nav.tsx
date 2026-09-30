import { cn } from "@/lib/utils";

type LegalFooterNavProps = {
  className?: string;
  /** Muted links on dark showcase surfaces */
  tone?: "default" | "inverse";
};

const LEGAL_PAGES = [
  { href: "/impressum", label: "Impressum" },
  { href: "/agb", label: "AGB" },
  { href: "/datenschutz", label: "Datenschutzerklärung" },
] as const;

export function LegalFooterNav({
  className,
  tone = "default",
}: LegalFooterNavProps) {
  const linkClass =
    tone === "inverse"
      ? "text-white/55 underline-offset-2 hover:text-white/85 hover:underline"
      : "text-[color:var(--vd-muted)] underline underline-offset-2 decoration-[color:var(--vd-border)] hover:text-[color:var(--vd-text)] hover:decoration-[color:var(--vd-muted)]";

  const separatorClass =
    tone === "inverse" ? "text-white/35" : "text-[color:var(--vd-border)]";

  return (
    <nav
      aria-label="Rechtliches"
      className={cn(
        "relative isolate flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-[0.72rem] leading-relaxed",
        className,
      )}
    >
      {LEGAL_PAGES.map((page, index) => (
        <span key={page.href} className="inline-flex items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden className={separatorClass}>
              ·
            </span>
          ) : null}
          <a href={page.href} className={linkClass}>
            {page.label}
          </a>
        </span>
      ))}
    </nav>
  );
}
