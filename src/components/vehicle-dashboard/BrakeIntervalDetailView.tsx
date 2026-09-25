"use client";

import { ArrowLeft, CheckCircle2, Gauge, Wrench } from "lucide-react";

import { resolveDocumentMileageKm } from "@/lib/documents/document-mileage";
import type { Document } from "@/types/database";

import type { BrakeServiceRecord } from "./brakeServiceRecords";
import {
  DocumentDetailHero,
  DocumentDetailHeroAmount,
  DocumentDetailHeroChip,
} from "@/components/documents/document-detail-hero";
import {
  ServiceIntervalDueHint,
  ServiceIntervalPartNumber,
} from "./service-interval-meta";
import { PressableLink } from "./Pressable";

interface BrakeIntervalDetailViewProps {
  record: BrakeServiceRecord;
  document: Document;
  vehicleModel: string;
  backHref?: string;
  invoiceHref?: string | null;
}

export function BrakeIntervalDetailView({
  record,
  document,
  vehicleModel,
  backHref = "/intervalle",
  invoiceHref,
}: BrakeIntervalDetailViewProps) {
  const mileageDisplay = resolveDocumentMileageKm(document) ?? record.mileageKm;

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="vd-anim-stack relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <PressableLink
          href={backHref}
          variant="pill"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück zur Historie
        </PressableLink>

        <DocumentDetailHero
          title="Bremsbeläge"
          subtitle={
            <>
              {record.date}
              {vehicleModel ? ` · ${vehicleModel}` : ""}
              {record.workshop ? ` · ${record.workshop}` : ""}
            </>
          }
          trailing={
            <DocumentDetailHeroAmount>
              {mileageDisplay.toLocaleString("de-DE")} km
            </DocumentDetailHeroAmount>
          }
          chips={
            <>
              {record.status === "aktuell" ? (
                <DocumentDetailHeroChip className="bg-emerald-500/10 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                  Aktuell
                </DocumentDetailHeroChip>
              ) : (
                <DocumentDetailHeroChip className="bg-neutral-900/5 text-[color:var(--vd-muted)]">
                  Erledigt
                </DocumentDetailHeroChip>
              )}
              <DocumentDetailHeroChip className="bg-neutral-900/5 text-[color:var(--vd-text)]">
                {record.intervalKm.toLocaleString("de-DE")} km Intervall
              </DocumentDetailHeroChip>
            </>
          }
        />

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
          <ServiceIntervalDueHint record={record} />
          <ServiceIntervalPartNumber partNumber={record.partNumber} />
        </section>

        {record.notes ? (
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
          </section>
        ) : null}

        {invoiceHref ? (
          <PressableLink
            href={invoiceHref}
            variant="pill"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3 text-[0.88rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <Gauge className="h-4 w-4" aria-hidden />
            Beleg öffnen
          </PressableLink>
        ) : null}
      </div>
    </div>
  );
}
