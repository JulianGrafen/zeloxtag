import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmailConfirmedPanel({ dashboardHref }: { dashboardHref: string }) {
  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))] sm:px-5">
      <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 shadow-[var(--vd-shadow)]">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
          E-Mail bestätigt
        </h1>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-[color:var(--vd-muted)]">
          Dein Konto ist aktiv. Weiter geht&apos;s auf deinem Dashboard.
        </p>
        <Link
          href={dashboardHref}
          className={cn(
            buttonVariants(),
            "mt-6 inline-flex h-12 w-full text-[0.95rem] font-semibold",
          )}
        >
          Zum Dashboard
        </Link>
      </div>
    </section>
  );
}
