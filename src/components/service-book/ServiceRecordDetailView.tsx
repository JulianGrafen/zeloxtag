"use client";

import { ArrowLeft, CalendarClock, Gauge, Wrench } from "lucide-react";

import { serviceCategoryLabel } from "@/lib/service/category-presets";
import type { ServiceRecord } from "@/lib/service/service-record";
import { PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { ServiceIntervalDueHint } from "@/components/vehicle-dashboard/service-interval-meta";

interface ServiceRecordDetailViewProps {
  record: ServiceRecord;
  vehicleModel: string;
  backHref: string;
  invoiceHref?: string | null;
}

export function ServiceRecordDetailView({
  record,
  vehicleModel,
  backHref,
  invoiceHref,
}: ServiceRecordDetailViewProps) {
  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div aria-hidden className="vd-atmosphere pointer-events-none absolute inset-0 z-0" />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <PressableLink href={backHref} variant="pill" className="vd-back-pill w-fit">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück
        </PressableLink>

        <div className="zt-feature-panel space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)]">
              <Wrench className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
                {serviceCategoryLabel(record.category)}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-[1.35rem] font-semibold text-[color:var(--vd-text)]">
                {record.title}
              </h1>
              <p className="text-[0.8rem] text-[color:var(--vd-muted)]">{vehicleModel}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <p className="flex items-center gap-1 text-[0.7rem] text-[color:var(--vd-muted)]">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                Datum
              </p>
              <p className="mt-1 text-[0.92rem] font-semibold">{record.date}</p>
            </div>
            <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
              <p className="flex items-center gap-1 text-[0.7rem] text-[color:var(--vd-muted)]">
                <Gauge className="h-3.5 w-3.5" aria-hidden />
                Kilometerstand
              </p>
              <p className="mt-1 text-[0.92rem] font-semibold">
                {record.mileage.toLocaleString("de-DE")} km
              </p>
            </div>
          </div>

          {record.performedBy ? (
            <p className="text-[0.88rem] text-[color:var(--vd-text)]">
              <span className="text-[color:var(--vd-muted)]">Durchgeführt von: </span>
              {record.performedBy}
            </p>
          ) : null}

          {record.notes ? (
            <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-text)]">
              {record.notes}
            </p>
          ) : null}

          {record.nextIntervalMileage != null || record.nextIntervalDate ? (
            <div className="rounded-xl border border-[color:var(--vd-border)] p-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]">
                Nächstes Intervall
              </p>
              {record.nextIntervalMileage != null ? (
                <p className="mt-1 text-[0.88rem]">
                  {record.nextIntervalMileage.toLocaleString("de-DE")} km
                </p>
              ) : null}
              {record.nextIntervalDate ? (
                <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
                  spätestens {record.nextIntervalDate}
                </p>
              ) : null}
              <ServiceIntervalDueHint
                record={{
                  kmBasedEstimate: false,
                  kmPerDay: null,
                  partNumber: null,
                  nextDueDate: record.nextIntervalDate ?? "",
                }}
              />
            </div>
          ) : null}

          {invoiceHref ? (
            <PressableLink
              href={invoiceHref}
              variant="button"
              className="inline-flex w-full justify-center rounded-xl border border-[color:var(--vd-border)] py-3 text-[0.88rem] font-medium"
            >
              Beleg öffnen
            </PressableLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}
