import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";

/**
 * Clean 404 for unknown / invalid ZeloxTag UUIDs (State C).
 */
export function TagNotFound() {
  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 px-4 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-5">
      <div className="vd-anim-header rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 shadow-[var(--vd-shadow)]">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white">
          <TriangleAlert className="h-5 w-5" aria-hidden />
        </div>
        <p className="mt-4 text-[0.65rem] font-medium tracking-[0.2em] text-[color:var(--vd-muted)] uppercase">
          404
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
          Tag nicht gefunden
        </h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
          Für diesen QR-Code existiert kein ZeloxTag-Eintrag. Prüfe den Scan oder
          kontaktiere den Support.
        </p>

        <Link
          href="/qr"
          className="mt-6 inline-flex items-center gap-2 text-[0.88rem] font-semibold text-[color:var(--vd-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zum QR-Generator
        </Link>
      </div>
    </section>
  );
}
