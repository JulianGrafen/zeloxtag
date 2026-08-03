"use client";

import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Droplet,
  Gauge,
  Wrench,
} from "lucide-react";

import type { OilChangeRecord } from "./oilChangeRecords";
import { PressableLink } from "./Pressable";

interface OilIntervalDetailViewProps {
  record: OilChangeRecord;
  vehicleModel: string;
}

export function OilIntervalDetailView({
  record,
  vehicleModel,
}: OilIntervalDetailViewProps) {
  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="vd-anim-stack relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <PressableLink
          href="/intervalle"
          variant="pill"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück zur Historie
        </PressableLink>

        <header className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
                Ölwechsel
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.45rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.65rem]">
                {record.date}
              </h1>
              <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
                {vehicleModel} · {record.workshop}
              </p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <Droplet className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {record.status === "aktuell" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Aktuell
              </span>
            ) : (
              <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--vd-muted)]">
                Erledigt
              </span>
            )}
            <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[0.7rem] font-medium text-[color:var(--vd-text)]">
              {record.intervalKm.toLocaleString("de-DE")} km Intervall
            </span>
          </div>
        </header>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Stand beim Wechsel
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[color:var(--vd-muted)]">
                <Gauge className="h-3.5 w-3.5" aria-hidden />
                <span className="text-[0.7rem]">Laufleistung</span>
              </div>
              <p className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
                {record.mileageKm.toLocaleString("de-DE")} km
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[color:var(--vd-muted)]">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                <span className="text-[0.7rem]">Datum</span>
              </div>
              <p className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
                {record.date}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Spezifikation
          </h2>
          <dl className="space-y-3 text-[0.88rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--vd-muted)]">Öl</dt>
              <dd className="max-w-[60%] text-right font-medium text-[color:var(--vd-text)]">
                {record.oilSpec}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--vd-muted)]">Menge</dt>
              <dd className="font-medium text-[color:var(--vd-text)]">
                {record.oilAmountLiters.toLocaleString("de-DE")} l
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--vd-muted)]">Filter</dt>
              <dd className="font-medium text-[color:var(--vd-text)]">
                {record.filterChanged ? "Erneuert" : "Unverändert"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--vd-muted)]">Werkstatt</dt>
              <dd className="max-w-[60%] text-right font-medium text-[color:var(--vd-text)]">
                {record.workshop}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Nächstes Intervall
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <p className="text-[0.7rem] text-[color:var(--vd-muted)]">km-Ziel</p>
              <p className="mt-0.5 text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
                {record.nextDueKm.toLocaleString("de-DE")} km
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <p className="text-[0.7rem] text-[color:var(--vd-muted)]">Spätestens</p>
              <p className="mt-0.5 text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
                {record.nextDueDate}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[0.78rem] text-[color:var(--vd-muted)]">
            Intervall: alle {record.intervalKm.toLocaleString("de-DE")} km oder{" "}
            {record.intervalMonths} Monate
          </p>
        </section>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <div className="mb-2 flex items-center gap-2 text-[color:var(--vd-muted)]">
            <Wrench className="h-3.5 w-3.5" aria-hidden />
            <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
              Notiz
            </h2>
          </div>
          <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-text)]">
            {record.notes}
          </p>

          {record.invoiceRef ? (
            <PressableLink
              href={`/rechnungen/${record.invoiceRef}`}
              variant="button"
              className="mt-4 inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-[color:var(--vd-text)] underline-offset-2"
            >
              Zugehörige Rechnung öffnen
            </PressableLink>
          ) : null}
        </section>
      </div>
    </div>
  );
}
