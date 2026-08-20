import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ScanContent } from "@/components/layout/scan-content";

interface LegalDocumentLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function LegalDocumentLayout({
  title,
  description,
  children,
}: LegalDocumentLayoutProps) {
  return (
    <AppShell showNavbar={false}>
      <ScanContent className="pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.78rem] font-medium text-[color:var(--vd-text)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Zurück zur Anmeldung
          </Link>
        </div>

        <article className="vd-surface-card space-y-6 p-6">
          <header className="space-y-2">
            <h1 className="claim-title text-[1.65rem]">{title}</h1>
            {description ? (
              <p className="claim-copy text-[0.92rem]">{description}</p>
            ) : null}
          </header>

          <div className="legal-prose space-y-5 text-[0.88rem] leading-relaxed text-[color:var(--vd-text)]">
            {children}
          </div>
        </article>

        <p className="text-center text-[0.75rem] text-[color:var(--vd-muted)]">
          <Link
            href="/impressum"
            className="underline-offset-2 hover:underline"
          >
            Impressum
          </Link>
          <span aria-hidden> · </span>
          <Link href="/agb" className="underline-offset-2 hover:underline">
            AGB
          </Link>
          <span aria-hidden> · </span>
          <Link
            href="/datenschutz"
            className="underline-offset-2 hover:underline"
          >
            Datenschutz
          </Link>
        </p>
      </ScanContent>
    </AppShell>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
        {title}
      </h2>
      <div className="space-y-2 text-[color:var(--vd-muted-strong,var(--vd-text))]">
        {children}
      </div>
    </section>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function LegalOrderedList({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 marker:text-[color:var(--vd-muted)]">
      {children}
    </ol>
  );
}

export function LegalUnorderedList({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-[color:var(--vd-muted)]">
      {children}
    </ul>
  );
}
