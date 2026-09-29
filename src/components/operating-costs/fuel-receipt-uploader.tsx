"use client";

import { Fuel } from "lucide-react";

import { InvoiceCaptureWizard } from "@/components/documents/invoice-capture-wizard";
import {
  ScanProcessingPanel,
  ScanProcessingStepChips,
} from "@/components/documents/scan-processing-panel";
import { BackNav } from "@/components/layout/back-nav";
import { ScanContent } from "@/components/layout/scan-content";
import { Button } from "@/components/ui/button";
import {
  activeFuelExtractStepIndex,
  FUEL_EXTRACT_STEPS,
  progressToOrbState,
} from "@/lib/documents/scan-progress-orb";
import { useFuelReceiptScan } from "@/hooks/use-fuel-fill-capture";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";

import { FuelFillFormFields } from "./fuel-fill-form-fields";

type FuelReceiptUploaderProps = {
  tagUuid: string;
  vehicleId: string;
  vehicleLabel: string;
  backHref?: string;
};

export function FuelReceiptUploader({
  tagUuid,
  vehicleId,
  vehicleLabel,
  backHref,
}: FuelReceiptUploaderProps) {
  const resolvedBackHref = backHref ?? `/v/${tagUuid}/tanken`;

  const {
    step,
    form,
    setForm,
    progress,
    previewUrl,
    error,
    submitError,
    pending,
    isCompressing,
    completeCapture,
    submit,
    resetWizard,
  } = useFuelReceiptScan({
    tagUuid,
    vehicleId,
    backHref: resolvedBackHref,
  });

  const captureBusy = isCompressing || step === "extracting";

  return (
    <ScanContent className="pb-12">
      <header className="vd-anim-header space-y-4">
        <BackNav label="Tanken" href={resolvedBackHref} />

        <div className="vd-surface-card p-5">
          <div className="vd-icon-badge">
            <Fuel className="h-5 w-5" aria-hidden />
          </div>
          <p className="claim-kicker mt-4">Tanken</p>
          <h1 className="claim-title mt-2">Tankbeleg scannen</h1>
          <p className="claim-copy mt-1">
            {vehicleLabel} · Quittung einlesen
          </p>
        </div>
      </header>

      {step === "compose" ? (
        <div className="vd-anim-header space-y-3">
          <InvoiceCaptureWizard
            title="Tankbeleg scannen"
            scanLabel="Tankquittung"
            hint="Foto im Scanner aufnehmen oder ein Bild aus der Galerie hochladen."
            allowPdf={false}
            showImageUploadOnIntro
            imageButtonLabel="Bild hochladen"
            disabled={captureBusy}
            onComplete={(files) => {
              void completeCapture(files);
            }}
          />
          {error ? (
            <p role="alert" className="vd-alert-error">{error}</p>
          ) : null}
          <p className="text-center text-[0.78rem] text-[color:var(--vd-muted)]">
            <PressableLink
              href={`/v/${tagUuid}/tanken/manuell`}
              className="font-medium text-[color:var(--vd-text)] underline decoration-[color:var(--vd-border)] underline-offset-4"
            >
              Stattdessen manuell eintragen
            </PressableLink>
          </p>
        </div>
      ) : null}

      {step === "extracting" ? (
        <div className="vd-anim-header rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]">
          <ScanProcessingPanel
            compact
            detail={progress.label}
            state={progressToOrbState(progress.percent, "ocr")}
            showProgress
            progressPercent={progress.percent}
            footer={
              <ScanProcessingStepChips
                steps={[...FUEL_EXTRACT_STEPS]}
                activeIndex={activeFuelExtractStepIndex(progress.percent)}
              />
            }
          />
        </div>
      ) : null}

      {step === "review" ? (
        <div className="vd-anim-header space-y-4">
          {previewUrl ? (
            <div className="overflow-hidden rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)]">
              <img
                src={previewUrl}
                alt="Vorschau Tankquittung"
                className="max-h-48 w-full object-contain bg-black/5"
              />
            </div>
          ) : null}

          <FuelFillFormFields
            value={form}
            onChange={setForm}
            disabled={pending}
          />

          {submitError ? (
            <p role="alert" className="vd-alert-error">{submitError}</p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-2xl"
              disabled={pending}
              onClick={resetWizard}
            >
              Anderen Beleg scannen
            </Button>
            <PressableButton
              type="button"
              disabled={pending}
              className="flex-1 rounded-2xl bg-neutral-950 py-3 text-[0.92rem] font-semibold text-white"
              onClick={submit}
            >
              {pending ? "Speichern…" : "Speichern"}
            </PressableButton>
          </div>
        </div>
      ) : null}
    </ScanContent>
  );
}
