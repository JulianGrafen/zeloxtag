"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleStop, Droplet, Pencil } from "lucide-react";

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
import { isEditableManualOilChangeDocument } from "@/lib/documents/manual-oil-change-form";
import { brakeServiceRecordListSubtitle } from "@/lib/documents/brake-service";
import { oilChangeRecordListSubtitle } from "@/lib/documents/oil-changes";
import { matchesSearchQuery } from "@/lib/documents/list-search";
import { formatMileageKm } from "@/utils/formatters";
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
import { PressableLink } from "./Pressable";
import { StatusPill, type IntervalRecordStatus } from "./service-status-pill";

type IntervalTab = "oil" | "brake";

const INTERVAL_TABS: ReadonlyArray<{ id: IntervalTab; label: string }> = [
  { id: "oil", label: "Öl" },
  { id: "brake", label: "Bremsen" },
];

const TAB_HEADINGS: Record<IntervalTab, string> = {
  oil: "Öl-Wechsel",
  brake: "Bremsbeläge",
};

function currentBadge(status: IntervalRecordStatus) {
  return status === "aktuell" ? (
    <StatusPill tone="green">Aktuell</StatusPill>
  ) : undefined;
}

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

  const scanFab =
    scanHref && tagUuid && !showForm ? (
      <DashboardScanFab
        tagUuid={tagUuid}
        directAction={
          canAddManual && !isBrakeTab ? "menu" : "scan"
        }
        menuTitle="Ölwechsel hinzufügen"
        hideFuelAction
        scanHref={scanHref}
        scanActionLabel="Beleg scannen"
        manualActionLabel="Ölwechsel eintragen"
        manualActionDescription="Ohne Scan — Datum, km, Ölsorte"
        onManualEntry={
          canAddManual && !isBrakeTab
            ? () => setShowManualForm(true)
            : undefined
        }
      />
    ) : null;

  return (
    <IOSListPage
      title="Service"
      subtitle={`${vehicleModel} · ${activeRecords.length} Einträge`}
      backHref={backHref}
      overlay={scanFab}
    >
      <IOSFilterChips
        chips={INTERVAL_TABS}
        activeId={activeTab}
        onChange={switchTab}
        ariaLabel="Intervall-Art"
      />

      {latest ? (
        <InsetGroupedCard header={TAB_HEADINGS[activeTab]}>
          <InsetListRow
            label={isBrakeTab ? "Letzter Service" : "Letzter Wechsel"}
            sublabel={formatMileageKm(latest.mileageKm)}
            value={latest.date}
            valueVariant="numeric"
          />
          <InsetListRow
            label="Nächster fällig"
            sublabel={formatMileageKm(latest.nextDueKm)}
            value={latest.nextDueDate}
            valueVariant="numeric"
          />
        </InsetGroupedCard>
      ) : null}

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
      >
        <AutomotiveSectionLabel>Historie</AutomotiveSectionLabel>
        {activeRecords.length === 0 ? (
          <AutomotiveEmptyPanel>
            {isBrakeTab
              ? "Noch kein Brems-Service hinterlegt. Scanne eine Rechnung mit Bremsbelägen oder trage Bremsen manuell über Service ein."
              : "Noch kein Ölwechsel hinterlegt. Trage einen manuell ein oder scanne eine Rechnung mit Motoröl / Ölfilter."}
          </AutomotiveEmptyPanel>
        ) : visibleRecords.length === 0 ? (
          <AutomotiveEmptyPanel>Keine Treffer für diese Suche.</AutomotiveEmptyPanel>
        ) : (
          <AutomotiveList
            aria-label={isBrakeTab ? "Bremsen Historie" : "Ölwechsel Historie"}
          >
            {isBrakeTab
              ? visibleBrakeRecords.map((record) => (
                  <AutomotiveListRow
                    key={record.id}
                    href={`${basePath}/${record.id}`}
                    icon={CircleStop}
                    iconTone="red"
                    title={record.date}
                    meta={brakeServiceRecordListSubtitle(record) || "—"}
                    badge={currentBadge(record.status)}
                  />
                ))
              : visibleOilRecords.map((record) => (
                  <AutomotiveListRow
                    key={record.id}
                    href={`${basePath}/${record.id}`}
                    icon={Droplet}
                    iconTone="amber"
                    title={record.date}
                    meta={oilChangeRecordListSubtitle(record) || "—"}
                    badge={currentBadge(record.status)}
                    accessory={
                      record.isManual && tagUuid ? (
                        <PressableLink
                          href={`${basePath}/${record.id}`}
                          variant="button"
                          aria-label="Ölwechsel bearbeiten"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#0A84FF] active:bg-white/10"
                        >
                          <Pencil className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                        </PressableLink>
                      ) : undefined
                    }
                  />
                ))}
          </AutomotiveList>
        )}
      </section>
    </IOSListPage>
  );
}
