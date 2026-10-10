"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { InlineThinkingOrb } from "@/components/ui/transition-loading";

import { DocumentUpload } from "@/components/dashboard/DocumentUpload";
import { GermanDateInput } from "@/components/documents/german-date-input";
import {
  GarageField,
  GarageFieldCell,
  GarageFieldRow,
  GarageInsetInput,
  GarageInsetSelect,
} from "@/components/ui/garage-field";
import {
  PressableButton,
  PressableLink,
} from "@/components/vehicle-dashboard/Pressable";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
} from "@/lib/documents/constants";
import { uploadDocument } from "@/lib/documents/upload-document";
import { isActionFailure } from "@/lib/permissions/feature-gate-result";
import { showSavedToast } from "@/lib/ui/saved-toast";
import { documentsListHref } from "@/lib/vehicle-surface/documents-list-href";
import { isVehicleId } from "@/lib/vehicle-surface/paths";
import type { VehicleSurfaceScope } from "@/lib/vehicle-surface/types";
import type { DocumentType } from "@/types/database";

interface DocumentUploadFormProps {
  vehicleId: string;
  tagUuid: string;
  vehicleLabel: string;
  defaultType?: DocumentType;
  /** Hide type picker (e.g. invoice-only upload from Belegliste). */
  lockType?: DocumentType;
  backHref?: string;
  vehicleSurfaceScope?: VehicleSurfaceScope;
}

/** Manual PDF/file upload fallback (no cloud OCR). */
export function DocumentUploadForm({
  vehicleId,
  tagUuid,
  vehicleLabel,
  defaultType = "invoice",
  lockType,
  backHref,
  vehicleSurfaceScope,
}: DocumentUploadFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>(lockType ?? defaultType);
  const resolvedBackHref =
    backHref ??
    documentsListHref(
      tagUuid,
      lockType === "invoice" || defaultType === "invoice" ? "invoice" : defaultType,
      vehicleSurfaceScope,
    );
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
      <header className="vd-anim-header space-y-4">
        <PressableLink
          href={resolvedBackHref}
          variant="pill"
          className="vd-back-pill"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück
        </PressableLink>

        <div className="zt-feature-panel p-5">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
            <Upload className="h-5 w-5" aria-hidden />
          </div>
          <p className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            Manuell
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.55rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            {lockType === "invoice" ? "Beleg hinzufügen" : "Datei hochladen"}
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
            {vehicleLabel} · PDF oder Bild (Bilder werden optimiert)
          </p>
        </div>
      </header>

      <form
        className="vd-anim-header space-y-3 zt-feature-panel p-4 shadow-[var(--vd-shadow-sm)]"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (!file) {
            setError("Bitte eine Datei wählen.");
            return;
          }

          startTransition(async () => {
            const formData = new FormData();
            formData.set("vehicleId", vehicleId);
            formData.set("tagUuid", tagUuid);
            formData.set("title", title);
            formData.set("type", type);
            formData.set("date", date);
            formData.set("amount", type === "abe" ? "" : amount);
            formData.set("file", file);

            const result = await uploadDocument(formData);
            if (isActionFailure(result)) {
              setError(result.message);
              return;
            }
            showSavedToast();
            router.push(
              documentsListHref(
                result.tagUuid,
                result.document.type,
                vehicleSurfaceScope ?? {
                  vehicleId,
                  linkedTagUuid: isVehicleId(result.tagUuid)
                    ? null
                    : result.tagUuid,
                },
              ),
            );
            router.refresh();
          });
        }}
      >
        <GarageField
          label={type === "abe" ? "Bauteil" : "Titel"}
          htmlFor="document-upload-title"
        >
          <GarageInsetInput
            id="document-upload-title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              type === "abe" ? "z. B. Carbon Frontlippe" : "z. B. Ölwechsel Rechnung"
            }
          />
        </GarageField>

        {!lockType ? (
          <GarageField label="Typ" htmlFor="document-upload-type">
            <GarageInsetSelect
              id="document-upload-type"
              value={type}
              onChange={(event) => {
                const next = event.target.value as DocumentType;
                setType(next);
                if (next === "abe") setAmount("");
              }}
            >
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {DOCUMENT_TYPE_LABELS[option]}
                </option>
              ))}
            </GarageInsetSelect>
          </GarageField>
        ) : null}

        {type === "abe" ? (
          <GarageField label="Datum" htmlFor="document-upload-date">
            <GermanDateInput
              id="document-upload-date"
              variant="inset"
              value={date || null}
              onChange={(iso) => setDate(iso ?? "")}
            />
          </GarageField>
        ) : (
          <GarageFieldRow>
            <GarageFieldCell label="Datum" htmlFor="document-upload-date">
              <GermanDateInput
                id="document-upload-date"
                variant="inset"
                value={date || null}
                onChange={(iso) => setDate(iso ?? "")}
              />
            </GarageFieldCell>
            <GarageFieldCell label="Betrag (€)" htmlFor="document-upload-amount">
              <GarageInsetInput
                id="document-upload-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="optional"
                className="tabular-nums"
              />
            </GarageFieldCell>
          </GarageFieldRow>
        )}

        <div className="space-y-1.5">
          <span className="block text-[0.72rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
            Datei
          </span>
          <DocumentUpload
            disabled={pending}
            label={fileName ?? "Datei wählen"}
            hint="PDF max. 10 MB · Bilder → Full HD JPEG"
            onReady={(results) => {
              const first = results[0];
              if (!first) return;
              setFile(first.file);
              setFileName(first.file.name);
              setError(null);
            }}
          />
          {pending ? (
            <p className="flex items-center gap-2 text-[0.78rem] text-[color:var(--vd-muted)]">
              <InlineThinkingOrb state="connecting" label="Hochladen" />
              Wird hochgeladen…
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-3 py-2.5 text-[0.8rem] text-red-700"
          >
            {error}
          </p>
        ) : null}

        <PressableButton
          type="submit"
          variant="button"
          disabled={pending || !file}
          className="claim-cta inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
        >
          Hochladen
        </PressableButton>
      </form>
    </section>
  );
}
