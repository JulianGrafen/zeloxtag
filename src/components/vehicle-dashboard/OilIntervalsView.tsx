"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  CircleStop,
  Droplet,
  Pencil,
  Plus,
} from "lucide-react";

import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import { ListSearchControls } from "@/components/documents/list-search-controls";
import { isEditableManualOilChangeDocument } from "@/lib/documents/manual-oil-change-form";
import { brakeServiceRecordListSubtitle } from "@/lib/documents/brake-service";
import { oilChangeRecordListSubtitle } from "@/lib/documents/oil-changes";
import { matchesSearchQuery } from "@/lib/documents/list-search";
import type { Document } from "@/types/database";

import {
  getLatestOilChange,
  OIL_CHANGE_RECORDS,
  type OilChangeRecord,
} from "./oilChangeRecords";
import {
  getLatestBrakeService,
  type BrakeServiceRecord,
} from "./brakeServiceRecords";
import { OilChangeManualForm } from "./oil-change-manual-form";
import { PressableButton, PressableLink } from "./Pressable";

type IntervalTab = "oil" | "brake";

interface OilIntervalsViewProps {
  vehicleModel: string;
  records?: OilChangeRecord[];
  brakeRecords?: BrakeServiceRecord[];
  /** Back navigation target (tag dashboard or demo home). */
  backHref?: string;
  /** Base path for detail links, e.g. `/v/{uuid}/intervalle`. */
  basePath?: string;
  /** Optional scan CTA for oil-change invoices. */
  scanHref?: string;
  tagUuid?: string;
  vehicleId?: string;
  canAddManual?: boolean;
  documents?: Document[];
}

export function OilIntervalsView({
  vehicleModel,
  records = OIL_CHANGE_RECORDS,
  brakeRecords = [],
  backHref = "/",
  basePath = "/intervalle",
  scanHref,
  tagUuid,
  vehicleId,
  canAddManual = false,
  documents = [],
}: OilIntervalsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editDocumentId = searchParams.get("edit");
  const activeTab: IntervalTab =
    searchParams.get("tab") === "bremsen" ? "brake" : "oil";
  const [query, setQuery] = useState("");
  const [showManualForm, setShowManualForm] = useState(
    Boolean(editDocumentId),
  );
  const latestOil = getLatestOilChange(records);
  const latestBrake = getLatestBrakeService(brakeRecords);
  const isBrakeTab = activeTab === "brake";
  const latest = isBrakeTab ? latestBrake : latestOil;
  const activeRecords = isBrakeTab ? brakeRecords : records;

  function switchTab(tab: IntervalTab) {
    if (tab === "brake") {
      router.replace(`${basePath}?tab=bremsen`);
      return;
    }
    router.replace(basePath);
  }

  const documentsById = useMemo(
    () => new Map(documents.map((doc) => [doc.id, doc])),
    [documents],
  );

  const editDocument = useMemo(() => {
    if (!editDocumentId) return null;
    const doc = documentsById.get(editDocumentId);
    return doc && isEditableManualOilChangeDocument(doc) ? doc : null;
  }, [documentsById, editDocumentId]);

  const showForm = showManualForm || Boolean(editDocument);

  function closeManualForm() {
    setShowManualForm(false);
    if (editDocumentId) {
      router.replace(basePath);
    }
  }

  const visibleOilRecords = useMemo(() => {
    return records.filter((record) =>
      matchesSearchQuery(
        query,
        record.date,
        record.workshop,
        record.oilSpec,
        record.notes,
        record.status,
        record.invoiceRef,
        String(record.mileageKm),
      ),
    );
  }, [records, query]);

  const visibleBrakeRecords = useMemo(() => {
    return brakeRecords.filter((record) =>
      matchesSearchQuery(
        query,
        record.date,
        record.workshop,
        record.notes,
        record.status,
        record.partNumber,
        String(record.mileageKm),
      ),
    );
  }, [brakeRecords, query]);

  const visibleRecords = isBrakeTab ? visibleBrakeRecords : visibleOilRecords;

  const searchResultLabel =
    visibleRecords.length === activeRecords.length
      ? undefined
      : `${visibleRecords.length} von ${activeRecords.length} Einträgen`;

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <div className="flex items-center justify-between gap-2">
            <PressableLink
              href={backHref}
              variant="pill"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Zurück
            </PressableLink>
            <div className="flex items-center gap-2">
              {canAddManual &&
              !isBrakeTab &&
              tagUuid &&
              vehicleId &&
              !showForm ? (
                <PressableButton
                  type="button"
                  variant="button"
                  onClick={() => setShowManualForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Eintragen
                </PressableButton>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)] sm:p-6">
            <div className="flex gap-2 rounded-full bg-[color:var(--vd-surface-elevated)] p-1">
              <PressableButton
                type="button"
                variant="button"
                onClick={() => switchTab("oil")}
                className={`flex-1 rounded-full px-3 py-2 text-[0.78rem] font-medium ${
                  !isBrakeTab
                    ? "bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-sm"
                    : "text-[color:var(--vd-muted)]"
                }`}
              >
                Öl
              </PressableButton>
              <PressableButton
                type="button"
                variant="button"
                onClick={() => switchTab("brake")}
                className={`flex-1 rounded-full px-3 py-2 text-[0.78rem] font-medium ${
                  isBrakeTab
                    ? "bg-[color:var(--vd-surface)] text-[color:var(--vd-text)] shadow-sm"
                    : "text-[color:var(--vd-muted)]"
                }`}
              >
                Bremsen
              </PressableButton>
            </div>

            <h1 className="mt-4 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--vd-text)] sm:text-[1.75rem]">
              {isBrakeTab ? "Bremsbeläge" : "Öl-Wechsel"}
            </h1>

            {latest ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
                  <p className="text-[0.7rem] text-[color:var(--vd-muted)]">
                    {isBrakeTab ? "Letzter Service" : "Letzter Wechsel"}
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

        {showForm && !isBrakeTab && tagUuid && vehicleId ? (
          <OilChangeManualForm
            tagUuid={tagUuid}
            vehicleId={vehicleId}
            editDocument={editDocument}
            onClose={closeManualForm}
          />
        ) : null}

        {activeRecords.length > 0 ? (
          <ListSearchControls
            query={query}
            onQueryChange={setQuery}
            placeholder={
              isBrakeTab
                ? "Werkstatt, Bremsen, km, Teilenummer…"
                : "Werkstatt, Öl, km, Notiz…"
            }
            resultLabel={searchResultLabel}
          />
        ) : null}

        <section
          aria-label={isBrakeTab ? "Bremsen Historie" : "Ölwechsel Historie"}
          className="space-y-2"
        >
          <h2 className="px-1 font-[family-name:var(--font-display)] text-[0.72rem] font-semibold tracking-[0.16em] text-[color:var(--vd-muted)] uppercase">
            Historie
          </h2>

          {activeRecords.length === 0 ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-6 text-center shadow-[var(--vd-shadow-sm)]">
              <p className="text-[0.9rem] text-[color:var(--vd-muted)]">
                {isBrakeTab
                  ? "Noch kein Brems-Service hinterlegt. Scanne eine Rechnung mit Bremsbelägen oder trage Bremsen manuell über Service ein."
                  : "Noch kein Ölwechsel hinterlegt. Trage einen manuell ein oder scanne eine Rechnung mit Motoröl / Ölfilter."}
              </p>
            </div>
          ) : visibleRecords.length === 0 ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-6 text-center shadow-[var(--vd-shadow-sm)]">
              <p className="text-[0.9rem] text-[color:var(--vd-muted)]">
                Keine Treffer für diese Suche.
              </p>
            </div>
          ) : (
          <ul className="vd-anim-list overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
            {isBrakeTab
              ? visibleBrakeRecords.map((record, index) => (
                  <li key={record.id}>
                    <PressableLink
                      href={`${basePath}/${record.id}`}
                      variant="row"
                      className="group flex min-w-0 items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                        <CircleStop
                          className="h-5 w-5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
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
                          {brakeServiceRecordListSubtitle(record) || "—"}
                        </span>
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
                        aria-hidden
                      />
                    </PressableLink>
                    {index < visibleBrakeRecords.length - 1 ? (
                      <div
                        aria-hidden
                        className="mx-4 border-t border-[color:var(--vd-border)]"
                      />
                    ) : null}
                  </li>
                ))
              : visibleOilRecords.map((record, index) => (
                  <li key={record.id}>
                    <div className="flex items-stretch">
                      <PressableLink
                        href={`${basePath}/${record.id}`}
                        variant="row"
                        className="group flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                          <Droplet
                            className="h-5 w-5"
                            strokeWidth={1.75}
                            aria-hidden
                          />
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
                            {oilChangeRecordListSubtitle(record) || "—"}
                          </span>
                        </span>

                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] group-data-[pressed=true]:translate-x-1.5"
                          aria-hidden
                        />
                      </PressableLink>

                      {record.isManual && tagUuid ? (
                        <PressableLink
                          href={`${basePath}/${record.id}`}
                          variant="button"
                          aria-label="Ölwechsel bearbeiten"
                          className="inline-flex shrink-0 items-center justify-center border-l border-[color:var(--vd-border)] px-3 text-[color:var(--vd-muted)]"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </PressableLink>
                      ) : null}
                    </div>

                    {index < visibleOilRecords.length - 1 ? (
                      <div
                        aria-hidden
                        className="mx-4 border-t border-[color:var(--vd-border)]"
                      />
                    ) : null}
                  </li>
                ))}
          </ul>
          )}
        </section>
      </div>

      {scanHref && tagUuid ? (
        <DashboardScanFab
          tagUuid={tagUuid}
          scanHref={scanHref}
          scanLabel="Beleg scannen"
        />
      ) : null}
    </div>
  );
}
