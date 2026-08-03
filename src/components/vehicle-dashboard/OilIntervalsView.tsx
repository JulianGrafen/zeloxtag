"use client";

import { ArrowLeft, ChevronRight, Droplet } from "lucide-react";

import {
  getLatestOilChange,
  OIL_CHANGE_RECORDS,
  type OilChangeRecord,
} from "./oilChangeRecords";
import { PressableLink } from "./Pressable";

interface OilIntervalsViewProps {
  vehicleModel: string;
  records?: OilChangeRecord[];
}

export function OilIntervalsView({
  vehicleModel,
  records = OIL_CHANGE_RECORDS,
}: OilIntervalsViewProps) {
  const latest = getLatestOilChange(records);

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
              Ölwechsel
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.75rem]">
              Intervalle
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleModel} · {records.length} Einträge
            </p>

            {latest ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
                  <p className="text-[0.7rem] text-[color:var(--vd-muted)]">
                    Letzter Wechsel
                  </p>
                  <p className="mt-0.5 text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
                    {latest.date}
                  </p>
                  <p className="text-[0.72rem] text-[color:var(--vd-muted)]">
                    {latest.mileageKm.toLocaleString("de-DE")} km
                  </p>
                </div>
                <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
                  <p className="text-[0.7rem] text-[color:var(--vd-muted)]">
                    Nächster fällig
                  </p>
                  <p className="mt-0.5 text-[0.92rem] font-semibold text-[color:var(--vd-text)]">
                    {latest.nextDueDate}
                  </p>
                  <p className="text-[0.72rem] text-[color:var(--vd-muted)]">
                    {latest.nextDueKm.toLocaleString("de-DE")} km
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <section aria-label="Ölwechsel Historie" className="space-y-2">
          <h2 className="px-1 font-[family-name:var(--font-display)] text-[0.72rem] font-semibold tracking-[0.16em] text-[color:var(--vd-muted)] uppercase">
            Historie
          </h2>

          <ul className="vd-anim-list overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
            {records.map((record, index) => (
              <li key={record.id}>
                <PressableLink
                  href={`/intervalle/${record.id}`}
                  variant="row"
                  className="group flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                    <Droplet className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
                        {record.date}
                      </span>
                      {record.status === "aktuell" ? (
                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-700">
                          Aktuell
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[0.75rem] text-[color:var(--vd-muted)]">
                      {record.mileageKm.toLocaleString("de-DE")} km ·{" "}
                      {record.oilSpec.split(" ").slice(0, 3).join(" ")}
                    </span>
                  </span>

                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1.5"
                    aria-hidden
                  />
                </PressableLink>

                {index < records.length - 1 ? (
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
