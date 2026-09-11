"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { FileUp, Loader2, Trash2 } from "lucide-react";

import { EngineStartButton } from "@/components/public-showcase/EngineStartButton";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  ENGINE_SOUND_ACCEPT,
  ENGINE_SOUND_MAX_SECONDS,
} from "@/lib/vehicles/engine-sound-constants";
import { measureAudioFileDurationSeconds } from "@/lib/vehicles/measure-audio-duration";
import { bytesToBase64 } from "@/lib/vehicles/engine-sound-json-upload";
import { validateEngineSoundUploadBytes } from "@/lib/vehicles/engine-sound-validation";

export type VehicleEngineSoundUploadProps = {
  vehicleId: string;
  tagUuid: string;
  soundUrl: string | null;
  canEdit: boolean;
  allowDelete?: boolean;
  onUploaded?: () => void;
  onDeleted?: () => void;
  className?: string;
};

type UploadState = "idle" | "uploading";

type UploadApiPayload = {
  ok?: boolean;
  error?: string;
  soundUrl?: string;
};

function mapUploadError(
  payload: UploadApiPayload | null,
  status: number,
): string {
  const message = payload?.error?.trim();
  if (message) return message;
  if (status === 413) return "Datei ist zu groß (max. 2 MB).";
  if (status === 415 || status === 422) {
    return "Nur MP3, M4A oder WAV bis 10 Sekunden werden unterstützt.";
  }
  return `Upload fehlgeschlagen (Fehler ${status}).`;
}

export function VehicleEngineSoundUpload({
  vehicleId,
  tagUuid,
  soundUrl,
  canEdit,
  allowDelete = false,
  onUploaded,
  onDeleted,
  className = "",
}: VehicleEngineSoundUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [deleting, setDeleting] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(soundUrl);

  useEffect(() => {
    setLocalPreviewUrl(soundUrl);
  }, [soundUrl]);

  const busy = state === "uploading" || deleting;
  const previewUrl = localPreviewUrl ?? soundUrl;

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setState("uploading");

      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const durationSeconds = await measureAudioFileDurationSeconds(
          file,
          bytes,
        );
        const meta = validateEngineSoundUploadBytes(
          bytes,
          file.type,
          file.name,
          durationSeconds,
        );
        if (!meta.ok) {
          throw new Error(meta.error);
        }

        const response = await fetch("/api/vehicle/engine-sound", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            vehicleId,
            tagUuid: tagUuid.trim() || undefined,
            durationSeconds: durationSeconds > 0 ? durationSeconds : 1,
            filename: file.name || "engine-sound",
            mime: file.type || undefined,
            fileBase64: bytesToBase64(bytes),
          }),
        });

        let payload: UploadApiPayload | null = null;
        try {
          payload = (await response.json()) as UploadApiPayload;
        } catch {
          payload = null;
        }

        if (!response.ok || !payload?.ok || !payload.soundUrl) {
          throw new Error(mapUploadError(payload, response.status));
        }

        setLocalPreviewUrl(payload.soundUrl.trim());
        onUploaded?.();
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Upload fehlgeschlagen. Bitte erneut versuchen.",
        );
      } finally {
        setState("idle");
      }
    },
    [onUploaded, tagUuid, vehicleId],
  );

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void processFile(file);
  }

  async function handleDelete() {
    if (!previewUrl || !allowDelete) return;
    setError(null);
    setDeleting(true);
    try {
      const response = await fetch("/api/vehicle/engine-sound", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vehicleId, tagUuid }),
      });
      let payload: { ok?: boolean; error?: string } | null = null;
      try {
        payload = (await response.json()) as { ok?: boolean; error?: string };
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ?? "Engine-Sound konnte nicht gelöscht werden.",
        );
      }
      setLocalPreviewUrl(null);
      onDeleted?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Löschen fehlgeschlagen.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section
      className={`rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5 ${className}`}
    >
      <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
        Engine soundcheck
      </h2>
      <p className="mt-2 text-[0.86rem] leading-relaxed text-[color:var(--vd-muted)]">
        Kurzer Motor-Sound für die öffentliche Visitenkarte (max.{" "}
        {ENGINE_SOUND_MAX_SECONDS} Sekunden, MP3, M4A oder WAV, max. 2 MB).
      </p>

      <div className="mt-4 rounded-[1.15rem] bg-black p-4">
        <EngineStartButton
          soundUrl={previewUrl}
          showMissingHint
          className="mt-0"
        />
      </div>

      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ENGINE_SOUND_ACCEPT}
            className="hidden"
            onChange={onInputChange}
            disabled={busy}
          />
          <PressableButton
            type="button"
            variant="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3 py-2.5 text-[0.8rem] font-medium"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {state === "uploading" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileUp className="h-4 w-4" aria-hidden />
            )}
            {previewUrl ? "Sound ersetzen" : "Sound hochladen"}
          </PressableButton>

          {previewUrl && allowDelete ? (
            <PressableButton
              type="button"
              variant="button"
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[0.8rem] font-medium text-red-800"
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              Entfernen
            </PressableButton>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-[0.82rem] font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
