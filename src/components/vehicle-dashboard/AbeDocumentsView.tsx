-"use client";

import { ArrowLeft, ChevronRight, FileText } from "lucide-react";

import { ABE_DOCUMENTS, type AbeDocument } from "./abeDocuments";
import { PressableLink } from "./Pressable";

interface AbeDocumentsViewProps {
  vehicleModel: string;
  documents?: AbeDocument[];
}

export function AbeDocumentsView({
  vehicleModel,
  documents = ABE_DOCUMENTS,
}: AbeDocumentsViewProps) {
  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <PressableLink
            href="/"
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück
          </PressableLink>

          <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)] sm:p-6">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Digitalisiert
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.75rem]">
              ABE & Gutachten
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleModel} · {documents.length} Dokumente
            </p>
          </div>
        </header>

        <section aria-label="ABE Dokumente" className="space-y-2">
          <h2 className="px-1 font-[family-name:var(--font-display)] text-[0.72rem] font-semibold tracking-[0.16em] text-[color:var(--vd-muted)] uppercase">
            Teileliste
          </h2>

          <ul className="vd-anim-list overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
            {documents.map((doc, index) => (
              <li key={doc.id}>
                <PressableLink
                  href={`/abe/${doc.id}`}
                  variant="row"
                  className="group flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                    <FileText className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                      {doc.partName}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.75rem] text-[color:var(--vd-muted)]">
                      <span>{doc.documentLabel}</span>
                      <span>· {doc.issuedAt}</span>
                      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-700">
                        {doc.status}
                      </span>
                    </span>
                  </span>

                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1.5"
                    aria-hidden
                  />
                </PressableLink>

                {index < documents.length - 1 ? (
                  <div
                    aria-hidden
                    className="mx-4 border-t border-[color:var(--vd-border)]"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export type { AbeDocument };
