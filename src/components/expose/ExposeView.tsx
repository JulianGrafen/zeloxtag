import Image from "next/image";
import type { ReactNode } from "react";
import { BadgeCheck, CalendarCheck, Droplets, Wrench } from "lucide-react";

import type { ExposeData, ExposeTimelineEntry } from "@/lib/vehicles/expose-data";
import {
  formatExposeCurrency,
  formatExposeDate,
  formatExposeMileage,
} from "@/lib/vehicles/expose-format";

import { ExposeToolbar } from "./ExposeToolbar";

type ExposeViewProps = {
  data: ExposeData;
};

const KIND_TONE: Record<ExposeTimelineEntry["kind"], string> = {
  service: "bg-emerald-50 text-emerald-800",
  modification: "bg-sky-50 text-sky-800",
  repair: "bg-amber-50 text-amber-900",
  tuev: "bg-violet-50 text-violet-800",
  other: "bg-zinc-100 text-zinc-700",
};

export function ExposeView({ data }: ExposeViewProps) {
  const yearLabel = data.firstRegistrationYear
    ? `EZ ${data.firstRegistrationYear}`
    : "Erstzulassung —";

  return (
    <div className="expose-root min-h-dvh bg-[#f4f1ea] text-zinc-950">
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="expose-card overflow-hidden rounded-[1.75rem] border border-zinc-200/80 bg-white shadow-[0_18px_40px_rgba(20,16,10,0.08)]">
          <div className="relative h-56 bg-zinc-100 sm:h-72">
            {data.heroImageSrc ? (
              <Image
                src={data.heroImageSrc}
                alt={`${data.vehicleTitle} Seitenprofil`}
                fill
                priority
                unoptimized
                className="object-contain object-center p-6"
                sizes="(max-width: 672px) 100vw, 672px"
              />
            ) : null}
          </div>
          <div className="space-y-4 px-5 pb-5 pt-4 sm:px-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Verkaufsexposé
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[2.35rem]">
              {data.vehicleTitle}
            </h1>
            <p className="text-[0.95rem] font-medium text-zinc-600">
              {yearLabel} · {formatExposeMileage(data.mileageKm)}
            </p>
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
              <BadgeCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                aria-hidden
              />
              <p className="text-[0.88rem] font-semibold leading-snug text-emerald-950">
                Verifiziertes ZeloxTag Fahrzeugdossier – {data.documentCount}{" "}
                {data.documentCount === 1 ? "Dokument" : "Dokumente"}{" "}
                fälschungssicher erfasst
              </p>
            </div>
            <ExposeToolbar vehicleTitle={data.vehicleTitle} />
          </div>
        </header>

        <section aria-labelledby="expose-invest-heading">
          <h2
            id="expose-invest-heading"
            className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500"
          >
            Investitionen
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label="Gesamtsumme"
              value={formatExposeCurrency(data.investmentTotal)}
              hint="Wartung & Tuning"
            />
            <StatTile
              icon={<Wrench className="h-4 w-4" aria-hidden />}
              label="Services"
              value={String(data.serviceCount)}
              hint="Durchgeführte Wartungen"
            />
            <StatTile
              icon={<Droplets className="h-4 w-4" aria-hidden />}
              label="Letzter Ölwechsel"
              value={formatExposeDate(data.lastOilChangeDate)}
              hint={
                data.lastTuevDate
                  ? `TÜV ${formatExposeDate(data.lastTuevDate)}${
                      data.lastTuevStatus ? ` · ${data.lastTuevStatus}` : ""
                    }`
                  : "Kein TÜV-Beleg"
              }
            />
          </div>
        </section>

        {data.investmentItems.length > 0 ? (
          <section
            className="expose-card rounded-[1.5rem] border border-zinc-200/80 bg-white p-5 shadow-[0_10px_28px_rgba(20,16,10,0.05)]"
            aria-labelledby="expose-items-heading"
          >
            <h2
              id="expose-items-heading"
              className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500"
            >
              Einzelposten
            </h2>
            <ul className="mt-4 divide-y divide-zinc-100">
              {data.investmentItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-[0.92rem] font-medium text-zinc-950">
                      {item.partName}
                    </p>
                    <p className="mt-0.5 text-[0.78rem] text-zinc-500">
                      {formatExposeDate(item.date)}
                      {item.workshop ? ` · ${item.workshop}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-[0.92rem] font-semibold tabular-nums">
                    {formatExposeCurrency(item.amount)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="expose-timeline-heading">
          <h2
            id="expose-timeline-heading"
            className="mb-3 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-zinc-500"
          >
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
            Historie
          </h2>
          {data.timeline.length === 0 ? (
            <p className="rounded-[1.5rem] border border-dashed border-zinc-300 bg-white/70 px-4 py-6 text-center text-[0.88rem] text-zinc-500">
              Noch keine Service- oder Umbauhistorie hinterlegt.
            </p>
          ) : (
            <ol className="relative space-y-3 border-l-2 border-zinc-200 pl-5">
              {data.timeline.map((entry) => (
                <li key={entry.id} className="expose-card relative">
                  <span
                    className="absolute -left-[1.54rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-zinc-900"
                    aria-hidden
                  />
                  <article className="rounded-[1.25rem] border border-zinc-200/80 bg-white p-4 shadow-[0_8px_20px_rgba(20,16,10,0.04)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <time
                        dateTime={entry.date}
                        className="text-[0.78rem] font-medium text-zinc-500"
                      >
                        {formatExposeDate(entry.date)}
                      </time>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] ${KIND_TONE[entry.kind]}`}
                      >
                        {entry.kindLabel}
                      </span>
                    </div>
                    <h3 className="mt-2 text-[1rem] font-semibold tracking-[-0.02em]">
                      {entry.title}
                    </h3>
                    {entry.parts ? (
                      <p className="mt-1 text-[0.86rem] text-zinc-700">
                        {entry.parts}
                      </p>
                    ) : null}
                    {entry.workshop ? (
                      <p className="mt-1 text-[0.78rem] text-zinc-500">
                        {entry.workshop}
                      </p>
                    ) : null}
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>

        <footer className="expose-no-print pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-[0.68rem] uppercase tracking-[0.18em] text-zinc-400">
          ZeloxTag · Fälschungssicheres Fahrzeugdossier
        </footer>
      </article>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: ReactNode;
}) {
  return (
    <div className="expose-card rounded-[1.25rem] border border-zinc-200/80 bg-white px-4 py-4 shadow-[0_8px_20px_rgba(20,16,10,0.04)]">
      <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[0.75rem] leading-snug text-zinc-500">{hint}</p>
    </div>
  );
}
