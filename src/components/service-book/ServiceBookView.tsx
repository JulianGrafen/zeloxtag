"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Wrench } from "lucide-react";

import { DashboardScanFab } from "@/components/tags/dashboard-scan-fab";
import { ListSearchControls } from "@/components/documents/list-search-controls";
import {
  AutomotiveEmptyPanel,
  AutomotiveList,
  AutomotiveListRow,
  AutomotiveSectionLabel,
} from "@/components/ui/automotive";
import {
  IOSFilterChips,
  IOSListPage,
  InsetGroupedCard,
  InsetListRow,
} from "@/components/ui/ios";
import { StatusPill } from "@/components/vehicle-dashboard/service-status-pill";
import { formatIsoMonthKeyLabel } from "@/lib/dates/german-calendar";
import { groupByIsoMonthKeyDesc, isoMonthKeyFromIsoTimestamp } from "@/lib/documents/group-by-iso-month";
import { matchesSearchQuery } from "@/lib/documents/list-search";
import { useServiceHistory } from "@/hooks/use-service-history";
import { QUICK_CHIP_CATEGORIES } from "@/lib/service/category-presets";
import type { ServiceDueAlert } from "@/lib/service/service-due-priority";
import type { ServiceRecord, ServiceRecordCategory } from "@/lib/service/service-record";
import { formatDateDE, formatMileageKm } from "@/utils/formatters";

import { ServiceRecordFormModal } from "./ServiceRecordFormModal";

const ALL_CHIP = "all";

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
  const parts = [
    formatDateDE(record.date),
    record.mileage > 0 ? formatMileageKm(record.mileage) : null,
    record.performedBy,
  ].filter(Boolean);
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

  const categoryChips = useMemo(
    () => [
      { id: ALL_CHIP, label: "Alle" },
      ...QUICK_CHIP_CATEGORIES.map((chip) => ({
        id: chip,
        label: categoryLabel(chip),
      })),
    ],
    [categoryLabel],
  );

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

  const canEnterManually = canAddManual && Boolean(tagUuid);

  const scanFab =
    scanHref && tagUuid && canAddManual ? (
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
    ) : null;

  return (
    <IOSListPage
      title="Service"
      subtitle={`${vehicleModel} · ${initialRecords.length} Einträge`}
      backHref={backHref}
      overlay={scanFab}
    >
      {urgentAlert || (canEnterManually && !showForm) ? (
        <InsetGroupedCard>
          {urgentAlert ? <UrgentServiceRow alert={urgentAlert} /> : null}
          {canEnterManually && !showForm ? (
            <InsetListRow
              onPress={() => setShowForm(true)}
              icon={Plus}
              iconTone="blue"
              emphasis="navigation"
              label="Service eintragen"
              chevron
            />
          ) : null}
        </InsetGroupedCard>
      ) : null}

      <IOSFilterChips
        chips={categoryChips}
        activeId={categoryFilter}
        onChange={(id) => setCategoryFilter(id as ServiceRecordCategory | "all")}
        ariaLabel="Service-Kategorien"
      />

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

      <section aria-label="Service Historie" className="space-y-6">
        {initialRecords.length === 0 ? (
          <AutomotiveEmptyPanel>
            Noch keine Wartungen hinterlegt. Trage einen Service ein oder scanne einen Beleg.
          </AutomotiveEmptyPanel>
        ) : visibleRecords.length === 0 ? (
          <AutomotiveEmptyPanel>Keine Treffer.</AutomotiveEmptyPanel>
        ) : (
          grouped.map(({ monthKey, items: monthRecords }) => (
            <div key={monthKey}>
              <AutomotiveSectionLabel>
                {formatIsoMonthKeyLabel(monthKey)}
              </AutomotiveSectionLabel>
              <AutomotiveList
                aria-label={`Service ${formatIsoMonthKeyLabel(monthKey)}`}
              >
                {monthRecords.map((record) => (
                  <AutomotiveListRow
                    key={record.id}
                    href={`${basePath}/${recordDetailId(record)}`}
                    icon={Wrench}
                    iconTone="blue"
                    title={record.title}
                    meta={formatRecordSubtitle(record)}
                  />
                ))}
              </AutomotiveList>
            </div>
          ))
        )}
      </section>
    </IOSListPage>
  );
}

function UrgentServiceRow({ alert }: { alert: ServiceDueAlert }) {
  const critical = alert.tone === "critical";
  return (
    <InsetListRow
      icon={AlertTriangle}
      iconTone={critical ? "red" : "amber"}
      emphasis="item"
      label={alert.label}
      trailing={
        <StatusPill tone={critical ? "red" : "amber"}>
          {critical ? "Fällig" : "Bald fällig"}
        </StatusPill>
      }
    />
  );
}
