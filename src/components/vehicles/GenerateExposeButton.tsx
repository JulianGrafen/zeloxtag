"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

import { GenerateExposeDialog } from "@/components/vehicles/GenerateExposeDialog";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  parseContentDispositionFilename,
  triggerBlobDownload,
} from "@/lib/documents/viewable-url";
import { sanitizePdfFilename } from "@/lib/vehicles/expose-pdf/formatters";

type GenerateExposeButtonProps = {
  vehicleId: string;
  vehicleLabel: string;
  disabled?: boolean;
  /** Profile default: finances hidden when true. */
  profileHidesFinancials?: boolean;
  onProRequired?: () => void;
};

export function GenerateExposeButton({
  vehicleId,
  vehicleLabel,
  disabled = false,
  profileHidesFinancials = true,
  onProRequired,
}: GenerateExposeButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readyUrl, setReadyUrl] = useState<string | null>(null);
  const [readyFilename, setReadyFilename] = useState<string | null>(null);

  async function runGenerate(includeFinancials: boolean) {
    setLoading(true);
    setError(null);
    setReadyUrl(null);
    setReadyFilename(null);

    try {
      const params = new URLSearchParams({
        includeFinancials: includeFinancials ? "1" : "0",
      });
      const url = `/api/vehicles/${encodeURIComponent(vehicleId)}/expose?${params}`;
      const response = await fetch(url, { method: "GET", credentials: "include" });

      if (!response.ok) {
        let message = "PDF konnte nicht erstellt werden.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error?.trim()) message = payload.error;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const filename =
        parseContentDispositionFilename(
          response.headers.get("Content-Disposition"),
        ) ?? sanitizePdfFilename(vehicleLabel);
      triggerBlobDownload(blob, filename);

      const objectUrl = URL.createObjectURL(blob);
      setReadyUrl(objectUrl);
      setReadyFilename(filename);
      setDialogOpen(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "PDF konnte nicht erstellt werden.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleOpenClick() {
    if (onProRequired) {
      onProRequired();
      return;
    }
    setError(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-2">
      <PressableButton
        type="button"
        variant="button"
        disabled={disabled || loading}
        onClick={handleOpenClick}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] px-4 py-3.5 text-[0.92rem] font-medium text-[color:var(--vd-text)] shadow-[var(--vd-shadow-sm)] disabled:opacity-60"
      >
        <FileDown className="h-4 w-4 shrink-0" aria-hidden />
        {loading ? "Exposé wird erstellt…" : "PDF-Exposé erstellen"}
      </PressableButton>
      <p className="text-[0.78rem] leading-relaxed text-[color:var(--vd-muted)]">
        Druckfertiges Verkaufs-Exposé für {vehicleLabel} — inkl. Historie, Umbauten
        und QR-Link zum ZeloxTag-Profil.
      </p>
      {error ? (
        <p className="text-[0.78rem] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {readyUrl && readyFilename ? (
        <p className="text-[0.78rem] text-[color:var(--vd-muted)]">
          Download gestartet. Falls nichts passiert ist:{" "}
          <a
            href={readyUrl}
            download={readyFilename}
            className="font-medium text-[color:var(--vd-text)] underline underline-offset-2"
          >
            PDF erneut speichern
          </a>
        </p>
      ) : null}

      <GenerateExposeDialog
        open={dialogOpen}
        vehicleLabel={vehicleLabel}
        profileHidesFinancials={profileHidesFinancials}
        loading={loading}
        onClose={() => {
          if (!loading) setDialogOpen(false);
        }}
        onConfirm={(includeFinancials) => void runGenerate(includeFinancials)}
      />
    </div>
  );
}
