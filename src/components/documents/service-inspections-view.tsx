"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Eye,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";

import { deleteDocument } from "@/actions/delete-document";
import { InvoiceUploader } from "@/components/dashboard/InvoiceUploader";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import {
  displayDocumentTitle,
  formatDocumentAmount,
  formatDocumentDate,
} from "@/lib/documents/format";
import { filterServiceInspectionDocuments } from "@/lib/documents/service-inspections";
import type { Document } from "@/types/database";

interface ServiceInspectionsViewProps {
  tagUuid: string;
  vehicleId: string;
  vehicleLabel: string;
  documents: Document[];
  /** Open scanner immediately. */
  initialScan?: boolean;
}

export function ServiceInspectionsView({
  tagUuid,
  vehicleId,
  vehicleLabel,
  documents,
  initialScan = false,
}: ServiceInspectionsViewProps) {
  const router = useRouter();
  const [scanning, setScanning] = useState(initialScan);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const inspections = filterServiceInspectionDocuments(documents);

  if (scanning) {
    return (
      <InvoiceUploader
        vehicleId={vehicleId}
        tagUuid={tagUuid}
        vehicleLabel={vehicleLabel}
        backHref={`/v/${tagUuid}/service`}
        backLabel="Service & Wartung"
        onBack={() => setScanning(false)}
        initialCategory="service"
        lockCategory
        heading="Inspektion scannen"
        subheading={`${vehicleLabel} · Servicebeleg einlesen`}
      />
    );
  }

  function handleDelete(documentId: string) {
    setError(null);
    setPendingId(documentId);
    startTransition(async () => {
      const result = await deleteDocument({
        documentId,
        vehicleId,
        tagUuid,
      });
      setPendingId(null);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="vd-root relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
        <header className="vd-anim-header space-y-4">
          <PressableLink
            href={`/v/${tagUuid}`}
            variant="pill"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-3 py-2 text-[0.78rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Dashboard
          </PressableLink>

          <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow)]">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
              <Wrench className="h-5 w-5" aria-hidden />
            </div>
            <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
              Service & Wartung
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
              Inspektionen
            </h1>
            <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
              {vehicleLabel} · {inspections.length}{" "}
              {inspections.length === 1 ? "Eintrag" : "Einträge"}
            </p>
          </div>
        </header>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
          >
            {error}
          </p>
        ) : null}

        <section aria-label="Inspektionsliste" className="space-y-2">
          {inspections.length === 0 ? (
            <div className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 text-[0.9rem] text-[color:var(--vd-muted)] shadow-[var(--vd-shadow-sm)]">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </div>
              <p className="font-medium text-[color:var(--vd-text)]">
                Noch keine Inspektionen
              </p>
              <p className="mt-1">
                Scanne Servicebelege, Ölwechsel oder Inspektionsrechnungen —
                Werkstatt, Datum und Betrag werden automatisch erkannt.
              </p>
            </div>
          ) : (
            <ul className="vd-anim-list overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] shadow-[var(--vd-shadow-sm)]">
              {inspections.map((doc) => {
                const amount = formatDocumentAmount(doc.amount);
                const workshop = doc.vendor?.trim() || null;
                const isMock = doc.file_url.startsWith("mock://");
                const canDelete = isMock || !doc.file_url.startsWith("/demo/");
                const detailHref = `/v/${tagUuid}/dokumente/${doc.id}`;

                return (
                  <li
                    key={doc.id}
                    className="flex w-full items-center gap-2 border-b border-[color:var(--vd-border)] px-3 py-3 last:border-b-0 sm:px-4 sm:py-3.5"
                  >
                    <PressableLink
                      href={detailHref}
                      variant="row"
                      className="vd-pressable vd-pressable--row group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left"
                    >
                      <InspectionRowBody
                        title={displayDocumentTitle(doc.title)}
                        workshop={workshop}
                        date={formatDocumentDate(doc.date)}
                        amount={amount}
                        showEye
                      />
                    </PressableLink>

                    {canDelete ? (
                      <PressableButton
                        type="button"
                        variant="button"
                        aria-label={`Löschen: ${displayDocumentTitle(doc.title)}`}
                        disabled={pending && pendingId === doc.id}
                        onClick={() => handleDelete(doc.id)}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--vd-border)] bg-white text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </PressableButton>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto w-full max-w-lg">
          <PressableButton
            type="button"
            variant="button"
            onClick={() => setScanning(true)}
            className="claim-cta inline-flex w-full items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Inspektion scannen
          </PressableButton>
        </div>
      </div>
    </div>
  );
}

function InspectionRowBody({
  title,
  workshop,
  date,
  amount,
  showEye = false,
}: {
  title: string;
  workshop: string | null;
  date: string;
  amount: string | null;
  showEye?: boolean;
}) {
  return (
    <>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-accent)] ring-1 ring-[color:var(--vd-border)]">
        <ClipboardList className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]">
              {title}
            </span>
            {workshop ? (
              <span className="mt-0.5 block truncate text-[0.75rem] text-[color:var(--vd-muted)]">
                {workshop}
              </span>
            ) : null}
          </span>
          {amount ? (
            <span className="shrink-0 text-[0.88rem] font-semibold text-[color:var(--vd-text)]">
              {amount}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[0.78rem] text-[color:var(--vd-muted)]">
          Inspektion · {date}
        </span>
      </span>
      {showEye ? (
        <Eye
          className="h-4 w-4 shrink-0 text-[color:var(--vd-muted)]"
          aria-hidden
        />
      ) : null}
    </>
  );
}
