"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { ExternalLink, FileUp, Loader2 } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  documentMediaKind,
  openDocumentOriginal,
  inlineDocumentProxyUrl,
} from "@/lib/documents/viewable-url";

export type VehicleDynoChartUploadProps = {
  vehicleId: string;
  tagUuid: string;
  dynoChartUrl: string | null;
  canEdit: boolean;
  onUploaded?: (dynoChartUrl: string) => void;
  className?: string;
};

type UploadState = "idle" | "uploading" | "done";

const PDF_ACCEPT = "application/pdf,.pdf";

type UploadApiPayload = {
  ok?: boolean;
  error?: string;
  dynoChartUrl?: string;
};

function mapUploadError(
  payload: UploadApiPayload | null,
  status: number,
): string {
  const message = payload?.error?.trim();
  if (message) return message;
  if (status === 0) {
    return "Netzwerkfehler beim Upload — bitte Verbindung prüfen.";
  }
  if (status === 401) {
    return "Sitzung abgelaufen — bitte erneut anmelden.";
  }
  if (status === 403) {
    return "Upload nicht erlaubt — nur der Fahrzeughalter darf hochladen.";
  }
  if (status === 413) {
    return "PDF ist zu groß — bitte kleinere Datei wählen.";
  }
  if (status === 415 || status === 422) {
    return "Nur PDF-Dateien werden unterstützt.";
  }
  return `Upload fehlgeschlagen (Fehler ${status}).`;
}

export function VehicleDynoChartUpload({
  vehicleId,
  tagUuid,
  dynoChartUrl,
  canEdit,
  onUploaded,
  className = "",
}: VehicleDynoChartUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [localUrl, setLocalUrl] = useState<string | null>(dynoChartUrl);

  useEffect(() => {
    setLocalUrl(dynoChartUrl);
  }, [dynoChartUrl]);

  const busy = state === "uploading";
  const chartUrl = localUrl ?? dynoChartUrl;
  const chartIsImage = chartUrl ? documentMediaKind(chartUrl) === "image" : false;
  const chartPreviewSrc = chartUrl ? inlineDocumentProxyUrl(chartUrl) : null;

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setState("uploading");

      try {
        const body = new FormData();
        body.append("vehicleId", vehicleId);
        body.append("tagUuid", tagUuid);
        body.append("file", file, file.name || "leistungsdiagramm.pdf");

        const response = await fetch("/api/vehicle/dyno-chart", {
          method: "POST",
          body,
          credentials: "include",
        });

        let payload: UploadApiPayload | null = null;
        try {
          payload = (await response.json()) as UploadApiPayload;
        } catch {
          payload = null;
        }

        if (!response.ok || !payload?.ok || !payload.dynoChartUrl) {
          throw new Error(mapUploadError(payload, response.status));
        }

        const url = payload.dynoChartUrl.trim();
        setLocalUrl(url);
        setState("done");
        onUploaded?.(url);
      } catch (uploadError) {
        setState("idle");
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Upload fehlgeschlagen. Bitte erneut versuchen.",
        );
      }
    },
    [onUploaded, tagUuid, vehicleId],
  );

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void processFile(file);
  }

  return (
    <section
      className={`rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)] ${className}`.trim()}
    >
      <h2 className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
        Leistungsdiagramm
      </h2>
      <p className="mt-2 text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
        Dyno- oder Leistungsdiagramm als PDF — z. B. vom Prüfstand oder Tuner.
      </p>

      {chartUrl ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-4 py-4">
          {chartIsImage && chartPreviewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={chartPreviewSrc}
              alt="Leistungsdiagramm"
              className="w-full rounded-xl border border-[color:var(--vd-border)] bg-neutral-950 object-contain"
            />
          ) : null}
          <p className={`text-[0.85rem] font-medium text-[color:var(--vd-text)] ${chartIsImage ? "mt-3" : ""}`}>
            Leistungsdiagramm hinterlegt
          </p>
          <p className="mt-1 text-[0.78rem] text-[color:var(--vd-muted)]">
            {chartIsImage
              ? "Vorschau — Original im Browser öffnen."
              : "PDF wird inline im Browser geöffnet."}
          </p>
          <PressableButton
            type="button"
            variant="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-[0.88rem] font-semibold text-white"
            onClick={() => openDocumentOriginal(chartUrl)}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Diagramm öffnen
          </PressableButton>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-4 py-6 text-center">
          <FileUp
            className="mx-auto h-7 w-7 text-[color:var(--vd-muted)]"
            aria-hidden
          />
          <p className="mt-2 text-[0.85rem] font-medium text-[color:var(--vd-text)]">
            Noch kein Leistungsdiagramm
          </p>
        </div>
      )}

      {canEdit ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={PDF_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            disabled={busy}
            onChange={onInputChange}
          />
          <PressableButton
            type="button"
            variant="button"
            disabled={busy}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-4 py-3.5 text-[0.88rem] font-medium text-[color:var(--vd-text)] disabled:opacity-60"
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                PDF wird hochgeladen…
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4" aria-hidden />
                {chartUrl ? "PDF ersetzen" : "PDF hochladen"}
              </>
            )}
          </PressableButton>
        </>
      ) : null}

      {error ? (
        <p className="mt-3 text-[0.85rem] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {state === "done" ? (
        <p className="mt-3 text-[0.85rem] text-emerald-700" role="status">
          Leistungsdiagramm gespeichert.
        </p>
      ) : null}
    </section>
  );
}
