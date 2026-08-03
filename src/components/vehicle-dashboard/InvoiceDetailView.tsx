"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Receipt,
  Share2,
} from "lucide-react";

import {
  formatEur,
  type InvoiceDocument,
} from "./invoiceDocuments";
import { PressableButton, PressableLink } from "./Pressable";

interface InvoiceDetailViewProps {
  document: InvoiceDocument;
  vehicleModel: string;
}

export function InvoiceDetailView({
  document,
  vehicleModel,
}: InvoiceDetailViewProps) {
  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="vd-anim-stack relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <PressableLink
          href="/rechnungen"
          variant="pill"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück zur Liste
        </PressableLink>

        <header className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
                {document.category} · Beleg
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.65rem]">
                {document.title}
              </h1>
              <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
                {document.vendor}
              </p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <Receipt className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                {document.status}
              </span>
              <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--vd-muted)]">
                {document.issuedAt}
              </span>
            </div>
            <p className="text-[1.35rem] font-bold tracking-[-0.03em] text-[color:var(--vd-text)]">
              {formatEur(document.amount)}
            </p>
          </div>
        </header>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Belegdaten
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-[0.85rem]">
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">Nummer</dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.invoiceNumber}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">Zahlung</dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.paymentMethod}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">Fahrzeug</dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {vehicleModel}
              </dd>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <dt className="text-[0.7rem] text-[color:var(--vd-muted)]">km-Stand</dt>
              <dd className="mt-0.5 font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.mileageKm
                  ? `${document.mileageKm.toLocaleString("de-DE")} km`
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[0.82rem] leading-relaxed text-[color:var(--vd-muted)]">
            {document.notes}
          </p>
        </section>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Positionen
          </h2>
          <ul className="space-y-2.5">
            {document.lineItems.map((item) => (
              <li
                key={item.label}
                className="flex items-start justify-between gap-3 text-[0.88rem]"
              >
                <span className="text-[color:var(--vd-text)]">{item.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-[color:var(--vd-text)]">
                  {formatEur(item.amount)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-[color:var(--vd-border)] pt-3">
            <span className="text-[0.85rem] font-medium text-[color:var(--vd-muted)]">
              Gesamt
            </span>
            <span className="text-[1.05rem] font-bold tracking-[-0.02em] text-[color:var(--vd-text)]">
              {formatEur(document.amount)}
            </span>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-white shadow-[var(--vd-shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[color:var(--vd-border)] bg-neutral-100 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[0.75rem] font-medium text-[color:var(--vd-text)]">
                {document.fileName}
              </p>
              <p className="text-[0.68rem] text-[color:var(--vd-muted)]">
                {document.fileSize} · gescannt {document.scannedAt}
              </p>
            </div>
          </div>

          <div className="space-y-4 p-5 font-[family-name:var(--font-display)]">
            <div className="space-y-1 border-b border-neutral-200 pb-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Rechnung
              </p>
              <p className="text-[1.1rem] font-bold tracking-[-0.02em] text-[color:var(--vd-text)]">
                {document.vendor}
              </p>
              <p className="text-[0.8rem] text-neutral-500">
                {document.invoiceNumber} · {document.issuedAt}
              </p>
            </div>

            <div className="space-y-2 text-[0.82rem]">
              {document.lineItems.slice(0, 4).map((item) => (
                <div key={item.label} className="flex justify-between gap-3">
                  <span className="text-neutral-600">{item.label}</span>
                  <span className="font-medium tabular-nums text-neutral-900">
                    {formatEur(item.amount)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between border-t border-neutral-200 pt-3 text-[0.95rem] font-bold">
              <span>Betrag</span>
              <span>{formatEur(document.amount)}</span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="h-2 rounded bg-neutral-100" />
              <div className="h-2 w-4/5 rounded bg-neutral-100" />
              <div className="h-2 w-3/5 rounded bg-neutral-100" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <PressableButton
            variant="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 text-[0.88rem] font-semibold text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Teilen
          </PressableButton>
          <PressableButton
            variant="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white shadow-[var(--vd-shadow-sm)]"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF öffnen
          </PressableButton>
        </div>
      </div>
    </div>
  );
}
