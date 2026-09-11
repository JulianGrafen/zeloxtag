"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Gauge,
  Pencil,
  Wrench,
} from "lucide-react";

import { isOilChangeSelfMadeVendor } from "@/lib/documents/oil-changes";
import type { Document } from "@/types/database";

import { OilChangeManualForm } from "./oil-change-manual-form";
import type { OilChangeRecord } from "./oilChangeRecords";
import {
  DocumentDetailHero,
  DocumentDetailHeroAmount,
  DocumentDetailHeroChip,
} from "@/components/documents/document-detail-hero";
import { PressableButton, PressableLink } from "./Pressable";

interface OilIntervalDetailViewProps {
  record: OilChangeRecord;
  vehicleModel: string;
  /** Back to oil history list. */
  backHref?: string;
  /** Optional link to the source invoice document. */
  invoiceHref?: string | null;
  tagUuid?: string;
  vehicleId?: string;
  /** Stored document row when this is a manual Ölwechsel log. */
  editDocument?: Document | null;
}

export function OilIntervalDetailView({
  record,
  vehicleModel,
  backHref = "/intervalle",
  invoiceHref = null,
  tagUuid,
  vehicleId,
  editDocument = null,
}: OilIntervalDetailViewProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const canEditManual = Boolean(editDocument && tagUuid && vehicleId);

  if (showEditForm && canEditManual && editDocument && tagUuid && vehicleId) {
    return (
      <div className="vd-root relative min-h-dvh overflow-x-hidden">
        <div
          aria-hidden
          className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
          <PressableLink
            href={backHref}
            variant="pill"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück zur Historie
          </PressableLink>

          <OilChangeManualForm
            tagUuid={tagUuid}
            vehicleId={vehicleId}
            editDocument={editDocument}
            onClose={() => setShowEditForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="vd-anim-stack relative z-10 mx-auto flex w-full max-w-lg flex-col gap-4 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <PressableLink
            href={backHref}
            variant="pill"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Zurück zur Historie
          </PressableLink>

          {canEditManual ? (
            <PressableButton
              type="button"
              variant="pill"
              onClick={() => setShowEditForm(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Bearbeiten
            </PressableButton>
          ) : null}
        </div>

        <DocumentDetailHero
          title="Ölwechsel"
          subtitle={
            <>
              {record.date}
              {vehicleModel ? ` · ${vehicleModel}` : ""}
              {record.workshop ? ` · ${record.workshop}` : ""}
            </>
          }
          trailing={
            <DocumentDetailHeroAmount>
              {record.mileageKm.toLocaleString("de-DE")} km
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
            {record.oilSpec ? (
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--vd-muted)]">Öl</dt>
                <dd className="max-w-[60%] text-right font-medium text-[color:var(--vd-text)]">
                  {record.oilSpec}
                </dd>
              </div>
            ) : null}
            {record.oilAmountLiters != null && record.oilAmountLiters > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--vd-muted)]">Menge</dt>
                <dd className="font-medium text-[color:var(--vd-text)]">
                  {record.oilAmountLiters.toLocaleString("de-DE")} l
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-[color:var(--vd-muted)]">Filter</dt>
              <dd className="font-medium text-[color:var(--vd-text)]">
                {record.filterChanged ? "Erneuert" : "Unverändert"}
              </dd>
            </div>
            {record.workshop ? (
              <div className="flex justify-between gap-3">
                <dt className="text-[color:var(--vd-muted)]">
                  {isOilChangeSelfMadeVendor(record.workshop)
                    ? "Durchführung"
                    : "Werkstatt"}
                </dt>
                <dd className="max-w-[60%] text-right font-medium text-[color:var(--vd-text)]">
                  {record.workshop}
                </dd>
              </div>
            ) : null}
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

          {invoiceHref && !record.isManual ? (
            <PressableLink
              href={invoiceHref}
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
