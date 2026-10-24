"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Plus, Wrench } from "lucide-react";

import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import { ListSearchControls } from "@/components/documents/list-search-controls";
import { formatIsoMonthKeyLabel } from "@/lib/dates/german-calendar";
import { groupByIsoMonthKeyDesc, isoMonthKeyFromIsoTimestamp } from "@/lib/documents/group-by-iso-month";
import { matchesSearchQuery } from "@/lib/documents/list-search";
import { useServiceHistory } from "@/hooks/use-service-history";
import { QUICK_CHIP_CATEGORIES } from "@/lib/service/category-presets";
import type { ServiceRecord } from "@/lib/service/service-record";
import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";

import { ServiceRecordFormModal } from "./ServiceRecordFormModal";
import { serviceFilterChipClassName } from "./service-filter-chip-styles";

interface ServiceBookViewProps {
  vehicleModel: string;
  records: ServiceRecord[];
  vehicleId: string;
  currentMileageKm: number | null;
  backHref?: string;
  basePath?: string;
  scanHref?: string;
  tagUuid?: string;
  canAddManual?: boolean;
}

function recordDetailId(record: ServiceRecord): string {
  return record.invoiceDocumentId ?? record.id;
}

function formatRecordSubtitle(record: ServiceRecord): string {
  const parts: string[] = [];
  if (record.mileage > 0) {
    parts.push(`${record.mileage.toLocaleString("de-DE")} km`);
  }
  if (record.performedBy) parts.push(record.performedBy);
  return parts.join(" · ") || "—";
}

export function ServiceBookView({
  vehicleModel,
  records: initialRecords,
  vehicleId,
  currentMileageKm,
  backHref = "/",
  basePath = "/intervalle",
  scanHref,
  tagUuid,
  canAddManual = false,
}: ServiceBookViewProps) {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const {
    filteredRecords,
    categoryFilter,
    setCategoryFilter,
    urgentAlert,
    refresh,
    categoryLabel,
  } = useServiceHistory({
    vehicleId,
    initialRecords,
    currentMileageKm,
  });

  const visibleRecords = useMemo(() => {
    return filteredRecords.filter((record) =>
      matchesSearchQuery(
        query,
        record.title,
        record.date,
        record.performedBy,
        record.notes,
        categoryLabel(record.category),
        String(record.mileage),
      ),
    );
  }, [filteredRecords, query, categoryLabel]);

  const grouped = useMemo(
    () =>
      groupByIsoMonthKeyDesc(visibleRecords, (record) =>
        isoMonthKeyFromIsoTimestamp(record.date),
      ),
    [visibleRecords],
  );

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div aria-hidden className="vd-atmosphere pointer-events-none absolute inset-0 z-0" />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <div className="flex items-center justify-between gap-2">
            <PressableLink href={backHref} variant="pill" className="vd-back-pill">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Zurück
            </PressableLink>
            {canAddManual && tagUuid && !showForm ? (
              <PressableButton
                type="button"
                variant="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Eintragen
              </PressableButton>
            ) : null}
          </div>

          <div className="zt-feature-panel p-5 sm:p-6">
            <h1 className="font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)]">
              Digitales Scheckheft
            </h1>
            <p className="mt-1 text-[0.82rem] text-[color:var(--vd-muted)]">{vehicleModel}</p>
            {urgentAlert ? (
              <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[0.82rem] font-medium text-amber-800 dark:text-amber-200">
                {urgentAlert.label}
              </p>
            ) : null}
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setCategoryFilter("all")}
            className={serviceFilterChipClassName(categoryFilter === "all")}
          >
            Alle
          </PressableButton>
          {QUICK_CHIP_CATEGORIES.map((chip) => (
            <PressableButton
              key={chip}
              type="button"
              variant="button"
              onClick={() => setCategoryFilter(chip)}
              className={serviceFilterChipClassName(categoryFilter === chip)}
            >
              {categoryLabel(chip)}
            </PressableButton>
          ))}
        </div>

        {showForm && tagUuid ? (
          <ServiceRecordFormModal
            vehicleId={vehicleId}
            tagUuid={tagUuid}
            onClose={() => setShowForm(false)}
            onSaved={refresh}
          />
        ) : null}

        {initialRecords.length > 0 ? (
          <ListSearchControls
            query={query}
            onQueryChange={setQuery}
            placeholder="Titel, Werkstatt, km, Kategorie…"
          />
        ) : null}

        <section aria-label="Service Historie" className="space-y-4">
          {initialRecords.length === 0 ? (
            <div className="zt-feature-panel px-4 py-6 text-center">
              <p className="text-[0.9rem] text-[color:var(--vd-muted)]">
                Noch keine Wartungen hinterlegt. Trage einen Service ein oder scanne einen Beleg.
              </p>
            </div>
          ) : visibleRecords.length === 0 ? (
            <div className="zt-feature-panel px-4 py-6 text-center">
              <p className="text-[0.9rem] text-[color:var(--vd-muted)]">Keine Treffer.</p>
            </div>
          ) : (
            grouped.map(({ monthKey, items: monthRecords }) => (
              <div key={monthKey} className="space-y-2">
                <h2 className="px-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
                  {formatIsoMonthKeyLabel(monthKey)}
                </h2>
                <ul className="zt-feature-panel overflow-hidden shadow-[var(--vd-shadow-sm)]">
                  {monthRecords.map((record, index) => (
                    <li key={record.id}>
                      <PressableLink
                        href={`${basePath}/${recordDetailId(record)}`}
                        variant="row"
                        className="flex min-w-0 items-center gap-3 px-4 py-3.5"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                          <Wrench className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-[family-name:var(--font-display)] text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
                            {record.title}
                          </span>
                          <span className="mt-0.5 block text-[0.75rem] text-[color:var(--vd-muted)]">
                            {formatRecordSubtitle(record)}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]" />
                      </PressableLink>
                      {index < monthRecords.length - 1 ? (
                        <div aria-hidden className="mx-4 border-t border-[color:var(--vd-border)]" />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>

      {scanHref && tagUuid && canAddManual ? (
        <DashboardScanFab
          tagUuid={tagUuid}
          directAction="menu"
          menuTitle="Rechnung oder manueller Eintrag"
          hideFuelAction
          scanHref={scanHref}
          scanActionLabel="Rechnung scannen"
          manualActionLabel="Manuell eintragen"
          manualActionDescription="Service ohne Beleg — Öl, Bremsen, Inspektion …"
          onManualEntry={() => setShowForm(true)}
        />
      ) : null}
    </div>
  );
}
