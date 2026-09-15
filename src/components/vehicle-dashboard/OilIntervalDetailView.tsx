"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Gauge,
  Pencil,
  Wrench,
} from "lucide-react";

import { isOilChangeSelfMadeVendor } from "@/lib/documents/oil-changes";
import { resolveDocumentMileageKm } from "@/lib/documents/document-mileage";
import { manualOilChangeFormFromDocument } from "@/lib/documents/manual-oil-change-form";
import {
  mapOilEditToDocumentTarget,
  OIL_DETAIL_EDIT_ANCHORS,
  scrollToOilEditTarget,
  type OilDetailEditTarget,
} from "@/lib/documents/oil-detail-edit";
import type { Document } from "@/types/database";

import type { OilChangeRecord } from "./oilChangeRecords";
import { OilDetailEditPickerSheet } from "./oil-detail-edit-picker-sheet";
import {
  DocumentDetailHero,
  DocumentDetailHeroAmount,
  DocumentDetailHeroChip,
} from "@/components/documents/document-detail-hero";
import { EditableDocumentDateSection } from "@/components/documents/editable-document-date-section";
import { EditableDocumentMileageSection } from "@/components/documents/editable-document-mileage-section";
import { EditableDocumentNotesSection } from "@/components/documents/editable-document-notes-section";
import { EditableVendorSection } from "@/components/documents/editable-vendor-section";
import { EditableOilChangeNotesSection } from "@/components/documents/editable-oil-change-notes-section";
import { EditableOilChangeVendorSection } from "@/components/documents/editable-oil-change-vendor-section";
import { EditableOilFilterSection } from "@/components/documents/editable-oil-filter-section";
import { EditableOilLitersSection } from "@/components/documents/editable-oil-liters-section";
import { EditableOilSpecSection } from "@/components/documents/editable-oil-spec-section";
import { PressableButton, PressableLink } from "./Pressable";

interface OilIntervalDetailViewProps {
  record: OilChangeRecord;
  document: Document;
  vehicleModel: string;
  backHref?: string;
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
    mileageKm !== null && mileageKm > 0
      ? mileageKm
      : record.mileageKm;

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
          title="Ölwechsel"
          subtitle={
            <>
              {record.date}
              {vehicleModel ? ` · ${vehicleModel}` : ""}
              {workshop ? ` · ${workshop}` : ""}
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
            Stand beim Wechsel
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {useCentralEdit ? (
              <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
                <EditableDocumentMileageSection
                  documentId={document.id}
                  vehicleId={vehicleId}
                  tagUuid={tagUuid}
                  mileageKm={mileageKm}
                  label="Laufleistung"
                  onSaved={setMileageKm}
                  hideEditTrigger={useCentralEdit}
                  editRequest={documentEditRequest}
                  editPulse={editPulse}
                  onEditRequestConsumed={handleEditRequestConsumed}
                  sectionId={OIL_DETAIL_EDIT_ANCHORS.mileage}
                />
              </div>
            ) : (
              <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[color:var(--vd-muted)]">
                  <Gauge className="h-3.5 w-3.5" aria-hidden />
                  <span className="text-[0.7rem]">Laufleistung</span>
                </div>
                <p className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
                  {mileageDisplay.toLocaleString("de-DE")} km
                </p>
              </div>
            )}
            {useCentralEdit ? (
              <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
                <EditableDocumentDateSection
                  documentId={document.id}
                  vehicleId={vehicleId}
                  tagUuid={tagUuid}
                  date={documentDate}
                  label="Datum"
                  onSaved={setDocumentDate}
                  hideEditTrigger={useCentralEdit}
                  editRequest={documentEditRequest}
                  editPulse={editPulse}
                  onEditRequestConsumed={handleEditRequestConsumed}
                  sectionId={OIL_DETAIL_EDIT_ANCHORS.date}
                />
              </div>
            ) : (
              <div className="rounded-xl bg-[color:var(--vd-surface-elevated)] p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[color:var(--vd-muted)]">
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  <span className="text-[0.7rem]">Datum</span>
                </div>
                <p className="text-[0.95rem] font-semibold text-[color:var(--vd-text)]">
                  {record.date}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
            Spezifikation
          </h2>
          <dl className="space-y-3 text-[0.88rem]">
            {isManualOilLog && useCentralEdit ? (
              <>
                <EditableOilSpecSection
                  documentId={document.id}
                  vehicleId={vehicleId}
                  tagUuid={tagUuid}
                  oilSpec={oilSpec}
                  onSaved={setOilSpec}
                  hideEditTrigger={useCentralEdit}
                  editRequest={editRequest}
                  editPulse={editPulse}
                  onEditRequestConsumed={handleEditRequestConsumed}
                  sectionId={OIL_DETAIL_EDIT_ANCHORS.oilSpec}
                />
                <EditableOilLitersSection
                  documentId={document.id}
                  vehicleId={vehicleId}
                  tagUuid={tagUuid}
                  oilAmountLiters={oilLiters}
                  onSaved={setOilLiters}
                  editRequest={editRequest}
                  editPulse={editPulse}
                  onEditRequestConsumed={handleEditRequestConsumed}
                  sectionId={OIL_DETAIL_EDIT_ANCHORS.oilLiters}
                />
                <EditableOilFilterSection
                  documentId={document.id}
                  vehicleId={vehicleId}
                  tagUuid={tagUuid}
                  filterChanged={filterChanged}
                  onSaved={setFilterChanged}
                  editRequest={editRequest}
                  editPulse={editPulse}
                  onEditRequestConsumed={handleEditRequestConsumed}
                  sectionId={OIL_DETAIL_EDIT_ANCHORS.filter}
                />
                <EditableOilChangeVendorSection
                  documentId={document.id}
                  vehicleId={vehicleId}
                  tagUuid={tagUuid}
                  workshop={workshop}
                  selfMade={oilSelfMade}
                  vendorDraft={oilVendorDraft}
                  onSaved={(nextWorkshop, nextSelfMade) => {
                    setWorkshop(nextWorkshop);
                    setOilSelfMade(nextSelfMade);
                  }}
                  hideEditTrigger={useCentralEdit}
                  editRequest={editRequest}
                  editPulse={editPulse}
                  onEditRequestConsumed={handleEditRequestConsumed}
                  sectionId={OIL_DETAIL_EDIT_ANCHORS.vendor}
                />
              </>
            ) : (
              <>
                {oilSpec || record.oilSpec ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[color:var(--vd-muted)]">Öl</dt>
                    <dd className="max-w-[60%] text-right font-medium text-[color:var(--vd-text)]">
                      {oilSpec || record.oilSpec}
                    </dd>
                  </div>
                ) : null}
                {(oilLiters ?? record.oilAmountLiters) != null &&
                (oilLiters ?? record.oilAmountLiters)! > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[color:var(--vd-muted)]">Menge</dt>
                    <dd className="font-medium text-[color:var(--vd-text)]">
                      {(oilLiters ?? record.oilAmountLiters)!.toLocaleString(
                        "de-DE",
                      )}{" "}
                      l
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-[color:var(--vd-muted)]">Filter</dt>
                  <dd className="font-medium text-[color:var(--vd-text)]">
                    {(isManualOilLog ? filterChanged : record.filterChanged)
                      ? "Erneuert"
                      : "Unverändert"}
                  </dd>
                </div>
                {workshop ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[color:var(--vd-muted)]">
                      {isOilChangeSelfMadeVendor(workshop)
                        ? "Durchführung"
                        : "Werkstatt"}
                    </dt>
                    <dd className="max-w-[60%] text-right font-medium text-[color:var(--vd-text)]">
                      {workshop}
                    </dd>
                  </div>
                ) : null}
              </>
            )}
            {!isManualOilLog && useCentralEdit ? (
              <div id={OIL_DETAIL_EDIT_ANCHORS.vendor} className="scroll-mt-24">
                <EditableVendorSection
                  documentId={document.id}
                  vehicleId={vehicleId}
                  tagUuid={tagUuid}
                  vendor={document.vendor}
                  label="Werkstatt"
                  onSaved={(vendor) =>
                    setWorkshop(vendor?.trim() || null)
                  }
                  hideEditTrigger={useCentralEdit}
                  editRequest={documentEditRequest}
                  editPulse={editPulse}
                  onEditRequestConsumed={handleEditRequestConsumed}
                />
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

        {isManualOilLog && useCentralEdit ? (
          <EditableOilChangeNotesSection
            documentId={document.id}
            vehicleId={vehicleId}
            tagUuid={tagUuid}
            notes={userNotes}
            onSaved={setUserNotes}
            hideEditTrigger={useCentralEdit}
            editRequest={editRequest}
            editPulse={editPulse}
            onEditRequestConsumed={handleEditRequestConsumed}
            sectionId={OIL_DETAIL_EDIT_ANCHORS.notes}
          />
        ) : !isManualOilLog && useCentralEdit ? (
          <EditableDocumentNotesSection
            documentId={document.id}
            vehicleId={vehicleId}
            tagUuid={tagUuid}
            notes={documentNotes}
            onSaved={setDocumentNotes}
            hideEditTrigger={useCentralEdit}
            editRequest={documentEditRequest}
            editPulse={editPulse}
            onEditRequestConsumed={handleEditRequestConsumed}
            sectionId={OIL_DETAIL_EDIT_ANCHORS.notes}
          />
        ) : (
          <section
            id={OIL_DETAIL_EDIT_ANCHORS.notes}
            className="scroll-mt-24 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
          >
            <div className="mb-2 flex items-center gap-2 text-[color:var(--vd-muted)]">
              <Wrench className="h-3.5 w-3.5" aria-hidden />
              <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]">
                Notiz
              </h2>
            </div>
            <p className="text-[0.88rem] leading-relaxed text-[color:var(--vd-text)]">
              {isManualOilLog ? userNotes || record.notes : record.notes}
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
        )}
      </div>

      <OilDetailEditPickerSheet
        open={editPickerOpen}
        onClose={() => setEditPickerOpen(false)}
        onSelect={handleEditPick}
        isManualOilLog={isManualOilLog}
        invoiceDocumentHref={invoiceHref}
      />

      {useCentralEdit ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          <div className="pointer-events-auto mx-auto flex max-w-lg gap-2">
            <PressableButton
              type="button"
              variant="button"
              onClick={() => setEditPickerOpen(true)}
              className="claim-cta inline-flex w-full items-center justify-center gap-2"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Bearbeiten
            </PressableButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
