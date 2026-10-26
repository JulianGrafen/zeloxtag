"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import {
  IOSListPage,
  InsetGroupedCard,
  InsetListRow,
} from "@/components/ui/ios";
import { isOilChangeSelfMadeVendor } from "@/lib/documents/oil-changes";
import { resolveDocumentMileageKm } from "@/lib/documents/document-mileage";
import { manualOilChangeFormFromDocument } from "@/lib/documents/manual-oil-change-form";
import {
  mapOilEditToDocumentTarget,
  OIL_DETAIL_EDIT_ANCHORS,
  scrollToOilEditTarget,
  type OilDetailEditTarget,
} from "@/lib/documents/oil-detail-edit";
import { formatDateDE, formatMileageKm } from "@/utils/formatters";
import type { Document } from "@/types/database";

import type { OilChangeRecord } from "./oilChangeRecords";
import { OilDetailEditPickerSheet } from "./oil-detail-edit-picker-sheet";
import { EditableDocumentDateSection } from "@/components/documents/editable-document-date-section";
import { EditableDocumentMileageSection } from "@/components/documents/editable-document-mileage-section";
import { EditableDocumentNotesSection } from "@/components/documents/editable-document-notes-section";
import { EditableVendorSection } from "@/components/documents/editable-vendor-section";
import { EditableOilChangeNotesSection } from "@/components/documents/editable-oil-change-notes-section";
import { EditableOilChangeVendorSection } from "@/components/documents/editable-oil-change-vendor-section";
import { EditableOilFilterSection } from "@/components/documents/editable-oil-filter-section";
import { EditableOilLitersSection } from "@/components/documents/editable-oil-liters-section";
import { EditableOilSpecSection } from "@/components/documents/editable-oil-spec-section";
import {
  IntervalNotesCard,
  IntervalStatusCard,
  NextIntervalCard,
  OpenInvoiceRow,
  intervalRuleFooter,
} from "./interval-detail-sections";
import { FixedBottomActionBar } from "@/components/vehicle-dashboard/fixed-bottom-action-bar";
import { PressableButton } from "./Pressable";

interface OilIntervalDetailViewProps {
  record: OilChangeRecord;
  document: Document;
  vehicleModel: string;
  backHref?: string;
  backLabel?: string;
  invoiceHref?: string | null;
  tagUuid: string;
  vehicleId: string;
  canEdit: boolean;
  isManualOilLog: boolean;
}

export function OilIntervalDetailView({
  record,
  document,
  vehicleModel,
  backHref = "/intervalle",
  backLabel = "Service",
  invoiceHref = null,
  tagUuid,
  vehicleId,
  canEdit,
  isManualOilLog,
}: OilIntervalDetailViewProps) {
  const router = useRouter();
  const useCentralEdit = canEdit && document.type === "invoice";

  const [editPickerOpen, setEditPickerOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<OilDetailEditTarget | null>(
    null,
  );
  const [editPulse, setEditPulse] = useState(0);

  const [documentDate, setDocumentDate] = useState(() => document.date);
  const [mileageKm, setMileageKm] = useState(() =>
    resolveDocumentMileageKm(document),
  );
  const [documentNotes, setDocumentNotes] = useState(() => document.notes);

  const initialOilForm = manualOilChangeFormFromDocument(document);
  const [oilSpec, setOilSpec] = useState<string | null>(
    initialOilForm.oilSpec || null,
  );
  const [oilLiters, setOilLiters] = useState<number | null>(() => {
    const parsed = Number.parseFloat(initialOilForm.oilLiters.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  });
  const [filterChanged, setFilterChanged] = useState(
    initialOilForm.filterChanged,
  );
  const [workshop, setWorkshop] = useState(record.workshop);
  const [oilSelfMade, setOilSelfMade] = useState(initialOilForm.selfMade);
  const [oilVendorDraft, setOilVendorDraft] = useState(initialOilForm.vendor);
  const [userNotes, setUserNotes] = useState(initialOilForm.notes);

  const documentEditRequest = mapOilEditToDocumentTarget(editRequest);

  const handleEditRequestConsumed = useCallback(() => {
    setEditRequest(null);
  }, []);

  function handleEditPick(target: OilDetailEditTarget) {
    if (target === "openInvoice" && invoiceHref) {
      setEditPickerOpen(false);
      router.push(invoiceHref);
      return;
    }
    setEditPickerOpen(false);
    requestAnimationFrame(() => {
      scrollToOilEditTarget(target);
      setEditRequest(target);
      setEditPulse((pulse) => pulse + 1);
    });
  }

  const mileageDisplay =
    mileageKm !== null && mileageKm > 0 ? mileageKm : record.mileageKm;
  const subtitle = [record.date, vehicleModel, workshop]
    .filter(Boolean)
    .join(" · ");

  const centralEditProps = {
    documentId: document.id,
    vehicleId,
    tagUuid,
    editPulse,
    onEditRequestConsumed: handleEditRequestConsumed,
  };

  const overlay = (
    <>
      <OilDetailEditPickerSheet
        open={editPickerOpen}
        onClose={() => setEditPickerOpen(false)}
        onSelect={handleEditPick}
        isManualOilLog={isManualOilLog}
        invoiceDocumentHref={invoiceHref}
      />
      {useCentralEdit ? (
        <FixedBottomActionBar variant="ios">
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setEditPickerOpen(true)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[17px] font-semibold text-black"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Bearbeiten
          </PressableButton>
        </FixedBottomActionBar>
      ) : null}
    </>
  );

  const staticNotes = isManualOilLog ? userNotes || record.notes : record.notes;

  return (
    <IOSListPage
      title="Ölwechsel"
      subtitle={subtitle}
      backHref={backHref}
      backLabel={backLabel}
      overlay={overlay}
    >
      <IntervalStatusCard status={record.status} intervalKm={record.intervalKm} />

      <InsetGroupedCard header="Stand beim Wechsel">
        {useCentralEdit ? (
          <>
            <EditableDocumentMileageSection
              {...centralEditProps}
              layout="inset-row"
              mileageKm={mileageKm}
              label="Laufleistung"
              onSaved={setMileageKm}
              hideEditTrigger
              editRequest={documentEditRequest}
              sectionId={OIL_DETAIL_EDIT_ANCHORS.mileage}
            />
            <EditableDocumentDateSection
              {...centralEditProps}
              layout="inset-row"
              date={documentDate}
              label="Datum"
              onSaved={setDocumentDate}
              hideEditTrigger
              editRequest={documentEditRequest}
              sectionId={OIL_DETAIL_EDIT_ANCHORS.date}
            />
          </>
        ) : (
          <>
            <InsetListRow
              label="Laufleistung"
              value={formatMileageKm(mileageDisplay) ?? "—"}
              valueVariant="numeric"
            />
            <InsetListRow
              label="Datum"
              value={formatDateDE(record.date) ?? record.date}
              valueVariant="numeric"
            />
          </>
        )}
      </InsetGroupedCard>

      <InsetGroupedCard header="Spezifikation">
        {isManualOilLog && useCentralEdit ? (
          <dl className="space-y-3 px-4 py-3 text-[15px]">
            <EditableOilSpecSection
              {...centralEditProps}
              oilSpec={oilSpec}
              onSaved={setOilSpec}
              hideEditTrigger
              editRequest={editRequest}
              sectionId={OIL_DETAIL_EDIT_ANCHORS.oilSpec}
            />
            <EditableOilLitersSection
              {...centralEditProps}
              oilAmountLiters={oilLiters}
              onSaved={setOilLiters}
              editRequest={editRequest}
              sectionId={OIL_DETAIL_EDIT_ANCHORS.oilLiters}
            />
            <EditableOilFilterSection
              {...centralEditProps}
              filterChanged={filterChanged}
              onSaved={setFilterChanged}
              editRequest={editRequest}
              sectionId={OIL_DETAIL_EDIT_ANCHORS.filter}
            />
            <EditableOilChangeVendorSection
              {...centralEditProps}
              workshop={workshop}
              selfMade={oilSelfMade}
              vendorDraft={oilVendorDraft}
              onSaved={(nextWorkshop, nextSelfMade) => {
                setWorkshop(nextWorkshop);
                setOilSelfMade(nextSelfMade);
              }}
              hideEditTrigger
              editRequest={editRequest}
              sectionId={OIL_DETAIL_EDIT_ANCHORS.vendor}
            />
          </dl>
        ) : (
          <>
            <OilSpecRows
              oilSpec={oilSpec || record.oilSpec}
              oilLiters={oilLiters ?? record.oilAmountLiters}
              filterChanged={
                isManualOilLog ? filterChanged : record.filterChanged
              }
              workshop={useCentralEdit ? null : workshop}
            />
            {useCentralEdit ? (
              <EditableVendorSection
                {...centralEditProps}
                layout="inset-row"
                vendor={document.vendor}
                label="Werkstatt"
                onSaved={(vendor) => setWorkshop(vendor?.trim() || null)}
                hideEditTrigger
                editRequest={documentEditRequest}
                sectionId={OIL_DETAIL_EDIT_ANCHORS.vendor}
              />
            ) : null}
          </>
        )}
      </InsetGroupedCard>

      <NextIntervalCard
        nextDueKm={record.nextDueKm}
        nextDueDate={record.nextDueDate}
        partNumber={record.partNumber}
        footer={intervalRuleFooter(record)}
      />

      {isManualOilLog && useCentralEdit ? (
        <EditableOilChangeNotesSection
          {...centralEditProps}
          notes={userNotes}
          onSaved={setUserNotes}
          hideEditTrigger
          editRequest={editRequest}
          sectionId={OIL_DETAIL_EDIT_ANCHORS.notes}
        />
      ) : !isManualOilLog && useCentralEdit ? (
        <EditableDocumentNotesSection
          {...centralEditProps}
          notes={documentNotes}
          onSaved={setDocumentNotes}
          hideEditTrigger
          editRequest={documentEditRequest}
          sectionId={OIL_DETAIL_EDIT_ANCHORS.notes}
        />
      ) : (
        <>
          {staticNotes ? (
            <IntervalNotesCard
              id={OIL_DETAIL_EDIT_ANCHORS.notes}
              notes={staticNotes}
            />
          ) : null}
          {invoiceHref && !record.isManual ? (
            <InsetGroupedCard>
              <OpenInvoiceRow
                href={invoiceHref}
                label="Zugehörige Rechnung öffnen"
              />
            </InsetGroupedCard>
          ) : null}
        </>
      )}
    </IOSListPage>
  );
}

function OilSpecRows({
  oilSpec,
  oilLiters,
  filterChanged,
  workshop,
}: {
  oilSpec: string | null;
  oilLiters: number | null;
  filterChanged: boolean;
  workshop: string | null;
}) {
  return (
    <>
      {oilSpec ? <InsetListRow label="Öl" value={oilSpec} /> : null}
      {oilLiters != null && oilLiters > 0 ? (
        <InsetListRow
          label="Menge"
          value={`${oilLiters.toLocaleString("de-DE")} l`}
          valueVariant="numeric"
        />
      ) : null}
      <InsetListRow
        label="Filter"
        value={filterChanged ? "Erneuert" : "Unverändert"}
      />
      {workshop ? (
        <InsetListRow
          label={
            isOilChangeSelfMadeVendor(workshop) ? "Durchführung" : "Werkstatt"
          }
          value={workshop}
        />
      ) : null}
    </>
  );
}
