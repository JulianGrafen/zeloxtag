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
      ? "text-white/55 underline-offset-2 hover:text-white/85 hover:underline active:text-white"
      : "text-[color:var(--vd-muted)] underline-offset-2 hover:underline active:text-[color:var(--vd-text)]";

  const linkLayout =
    "relative z-[1] inline-flex min-h-11 min-w-[4.5rem] cursor-pointer items-center justify-center px-2 touch-manipulation";

  return (
    <nav
      aria-label="Rechtliches"
      className={cn(
        "relative isolate z-[100] flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[0.72rem]",
        className,
      )}
    >
      {LEGAL_PAGES.map((page) => (
        <a key={page.href} href={page.href} className={cn(linkLayout, linkClass)}>
          {page.label}
        </a>
      ))}
    </nav>
  );
}
