"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { Camera, ImagePlus, Loader2, SkipForward } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import {
  compressSilhouetteImage,
  SilhouetteCompressionError,
} from "@/lib/vehicles/compress-silhouette-image";
import { prefetchSilhouetteImage } from "@/lib/vehicles/prefetch-silhouette-image";
import { fileToPreviewDataUrl } from "@/lib/vehicles/silhouette-preview-session";

export type SilhouetteUploadResult = {
  /** Supabase public URL with cache-bust (DB source of truth). */
  storageUrl: string;
  /** Same-origin proxy URL — use this in the dashboard header. */
  displayUrl: string;
  /** Local blob URL for instant header preview until the proxy is shown. */
  previewUrl?: string;
  /** Inline data URL — survives blob revoke under COEP. */
  previewDataUrl?: string;
};

export type ClientVehicleUploadProps = {
  vehicleId: string;
  tagUuid: string;
  onUploaded?: (result: SilhouetteUploadResult) => void;
  onSkip?: () => void;
  skipLabel?: string;
  title?: string;
  description?: string;
  className?: string;
};

type UploadState = "idle" | "compressing" | "uploading" | "done";

const IMAGE_ACCEPT = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";

function FilePickLabel({
  disabled,
  capture,
  onChange,
  className,
  children,
}: {
  disabled: boolean;
  capture?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <label
      className={`${className} ${disabled ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
    >
      <input
        type="file"
        accept={IMAGE_ACCEPT}
        {...(capture ? { capture: "environment" as const } : {})}
        disabled={disabled}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={onChange}
      />
      {children}
    </label>
  );
}

type UploadApiPayload = {
  ok?: boolean;
  error?: string;
  silhouetteImageUrl?: string;
  silhouetteDisplayUrl?: string;
};

function uploadSilhouette(
  url: string,
  body: FormData,
): Promise<{ ok: boolean; status: number; payload: UploadApiPayload | null }> {
  return fetch(url, {
    method: "POST",
    body,
    credentials: "include",
  })
    .then(async (response) => {
      let payload: UploadApiPayload | null = null;
      try {
        payload = (await response.json()) as UploadApiPayload;
      } catch {
        payload = null;
      }
      return {
        ok: response.ok,
        status: response.status,
        payload,
      };
    })
    .catch(() => ({
      ok: false,
      status: 0,
      payload: null,
    }));
}

function mapUploadError(
  payload: UploadApiPayload | null,
  status: number,
): string {
  const message = payload?.error?.trim();
  if (message === "Origin required." || message === "Origin not allowed.") {
    return "Upload blockiert — bitte Seite neu laden und erneut versuchen.";
  }
  if (message === "Authentication required.") {
    return "Sitzung abgelaufen — bitte erneut anmelden und Upload wiederholen.";
  }
  if (message === "Multi-factor authentication required.") {
    return "Bitte zuerst Zwei-Faktor-Authentifizierung abschließen.";
  }
  if (message) {
    if (/jpeg.*not supported|mime type.*not supported/i.test(message)) {
      return "Foto konnte nicht gespeichert werden — bitte kurz warten und erneut versuchen.";
    }
    return message;
  }
  if (status === 0) {
    return "Netzwerkfehler beim Upload — bitte Verbindung prüfen.";
  }
  if (status === 401) {
    return "Sitzung abgelaufen — bitte erneut anmelden und Upload wiederholen.";
  }
  if (status === 403) {
    return "Upload nicht erlaubt — bitte Seite neu laden.";
  }
  if (status === 404) {
    return "Upload-Dienst nicht erreichbar — bitte Seite neu laden (Cache leeren).";
  }
  if (status === 413) {
    return "Foto ist zu groß — bitte ein kleineres Bild wählen.";
  }
  if (status === 415 || status === 422) {
    return "Dateiformat nicht unterstützt — bitte JPEG oder PNG verwenden.";
  }
  if (status === 429) {
    return "Zu viele Versuche — bitte kurz warten und erneut versuchen.";
  }
  if (status >= 500) {
    return "Serverfehler beim Speichern — bitte später erneut versuchen.";
  }
  if (status === 400) {
    return "Upload fehlgeschlagen — bitte Seite neu laden und erneut versuchen.";
  }
  return `Upload fehlgeschlagen (Fehler ${status}).`;
}

async function materializeUploadFile(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength < 32) {
    throw new Error("Datei ist leer — bitte anderes Foto wählen.");
  }
  return new File([bytes], file.name || "vehicle-side.jpg", {
    type: file.type || "application/octet-stream",
    lastModified: Date.now(),
  });
}

function PreviewFrame({
  previewUrl,
  emptyLabel = "Foto wählen",
}: {
  previewUrl: string | null;
  emptyLabel?: string;
}) {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[14rem] overflow-hidden rounded-[1.1rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] shadow-[var(--vd-shadow-sm)] ring-1 ring-inset ring-white/50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
      />
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Vorschau Fahrzeugfoto"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_center,var(--vd-glow-soft)_0%,transparent_70%)] px-4 text-center">
          <ImagePlus
            className="h-7 w-7 text-[color:var(--vd-muted)]"
            aria-hidden
          />
          <p className="text-[0.78rem] font-medium text-[color:var(--vd-text)]">
            {emptyLabel}
          </p>
          <p className="text-[0.7rem] text-[color:var(--vd-muted)]">
            Galerie oder Kamera
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Simple vehicle photo upload for the dashboard header (no background removal).
 */
export function ClientVehicleUpload({
  vehicleId,
  tagUuid,
  onUploaded,
  onSkip,
  skipLabel = "Später",
  title = "Fahrzeugfoto",
  description = "Lade ein Foto deines Autos hoch — es erscheint oben rechts in deinem Dashboard.",
  className = "",
}: ClientVehicleUploadProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const busy = state === "compressing" || state === "uploading";

  const barProgress =
    state === "compressing"
      ? 12
      : state === "uploading"
        ? Math.max(12, uploadProgress)
        : 0;

  const loadingText =
    state === "compressing" ? "Foto wird vorbereitet…" : "Foto wird gespeichert…";

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setState("compressing");
      setUploadProgress(0);

      let compressed: File;
      try {
        compressed = await compressSilhouetteImage(file);
      } catch (compressError) {
        setState("idle");
        setError(
          compressError instanceof SilhouetteCompressionError
            ? compressError.message
            : "Foto konnte nicht vorbereitet werden.",
        );
        return;
      }

      const localPreview = URL.createObjectURL(compressed);
      setPreviewUrl((previous) => {
        if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
        return localPreview;
      });

      setState("uploading");
      setUploadProgress(45);

      try {
        const uploadFile = await materializeUploadFile(compressed);
        const body = new FormData();
        body.append("vehicleId", vehicleId);
        body.append("tagUuid", tagUuid);
        body.append("file", uploadFile, uploadFile.name || "vehicle-photo.jpg");

        const { ok, status, payload } = await uploadSilhouette(
          "/api/vehicle/photo",
          body,
        );

        if (!ok || !payload?.ok || !payload.silhouetteImageUrl) {
          throw new Error(mapUploadError(payload, status));
        }

        const storageUrl = payload.silhouetteImageUrl.trim();
        const displayUrl =
          payload.silhouetteDisplayUrl?.trim() || storageUrl;

        const previewBlobUrl = URL.createObjectURL(uploadFile);
        const previewDataUrl = await fileToPreviewDataUrl(uploadFile);

        setUploadProgress(100);
        setPreviewUrl((previous) => {
          if (previous?.startsWith("blob:")) {
            URL.revokeObjectURL(previous);
          }
          return previewBlobUrl;
        });
        setState("done");
        onUploaded?.({
          storageUrl,
          displayUrl,
          previewUrl: previewBlobUrl,
          previewDataUrl: previewDataUrl ?? undefined,
        });

        if (displayUrl.startsWith("/api/vehicle/silhouette/")) {
          void prefetchSilhouetteImage(displayUrl, { attempts: 4 });
        }
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

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  return (
    <section
      className={`rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)] ${className}`.trim()}
    >
      <h2 className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
        {title}
      </h2>
      <p className="mt-2 text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
        {description}
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!busy) galleryInputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!busy) galleryInputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative mt-4 cursor-pointer rounded-2xl border border-dashed px-4 py-5 transition-colors ${
          dragOver
            ? "border-neutral-900 bg-neutral-900/[0.04]"
            : "border-[color:var(--vd-border)] bg-[color:var(--vd-bg)]"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        <PreviewFrame previewUrl={previewUrl} />

        {busy ? (
          <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 rounded-2xl bg-[color:var(--vd-surface)]/85 px-5 text-center backdrop-blur-[2px]">
            <p className="inline-flex items-center gap-2 text-[0.85rem] font-medium text-[color:var(--vd-text)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {loadingText}
            </p>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full min-w-[8%] rounded-full bg-neutral-900 transition-[width] duration-300"
                style={{ width: `${barProgress}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={onInputChange}
      />

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <FilePickLabel
          disabled={busy}
          onChange={onInputChange}
          className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.88rem] font-semibold text-white"
        >
          <ImagePlus className="relative z-0 h-4 w-4" aria-hidden />
          <span className="relative z-0">
            {previewUrl ? "Anderes Foto" : "Galerie"}
          </span>
        </FilePickLabel>
        <FilePickLabel
          disabled={busy}
          capture
          onChange={onInputChange}
          className="relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-4 py-3.5 text-[0.88rem] font-medium text-[color:var(--vd-text)]"
        >
          <Camera className="relative z-0 h-4 w-4" aria-hidden />
          <span className="relative z-0">Kamera</span>
        </FilePickLabel>
      </div>

      {onSkip ? (
        <PressableButton
          type="button"
          variant="button"
          disabled={busy}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-4 py-3 text-[0.88rem] font-medium text-[color:var(--vd-muted)] disabled:opacity-60"
          onClick={onSkip}
        >
          <SkipForward className="h-4 w-4" aria-hidden />
          {skipLabel}
        </PressableButton>
      ) : null}

      {error ? (
        <p className="mt-3 text-[0.85rem] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {state === "done" ? (
        <p className="mt-3 text-[0.85rem] text-emerald-700" role="status">
          Fahrzeugfoto gespeichert — es erscheint oben rechts im Dashboard.
        </p>
      ) : null}
    </section>
  );
}
