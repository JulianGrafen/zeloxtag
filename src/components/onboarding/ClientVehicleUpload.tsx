"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, SkipForward } from "lucide-react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { VehicleSilhouette } from "@/components/vehicle-dashboard/VehicleSilhouette";
import {
  isCrossOriginIsolated,
  preloadVehicleBackgroundRemoval,
  removeVehicleBackground,
  type CutoutProgress,
} from "@/lib/vehicles/client-background-removal";
import {
  compressSilhouetteImage,
  shrinkCutoutPng,
  SilhouetteCompressionError,
} from "@/lib/vehicles/compress-silhouette-image";

export type ClientVehicleUploadProps = {
  vehicleId: string;
  tagUuid: string;
  onUploaded?: (silhouetteImageUrl: string) => void;
  onSkip?: () => void;
  skipLabel?: string;
  title?: string;
  description?: string;
  className?: string;
};

type UploadState = "idle" | "compressing" | "removing" | "uploading" | "done";

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
  backgroundRemoved?: boolean;
};

function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress: (percent: number) => void,
): Promise<{ ok: boolean; status: number; payload: UploadApiPayload | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(95, Math.max(5, Math.round((event.loaded / event.total) * 95))));
    };

    xhr.onload = () => {
      let payload: UploadApiPayload | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as UploadApiPayload;
      } catch {
        payload = null;
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        payload,
      });
    };

    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload."));
    xhr.ontimeout = () => reject(new Error("Upload ist abgelaufen."));
    xhr.timeout = 120_000;
    xhr.send(body);
  });
}

async function toPngFile(blob: Blob, baseName: string): Promise<File> {
  // Materialize bytes — some iOS/WebKit paths upload empty Files from live Blobs.
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.byteLength < 32) {
    throw new Error("Freistellung lieferte eine leere Datei.");
  }
  return new File([bytes], `${baseName}-cutout.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}

/**
 * Privacy-first vehicle upload: `@imgly/background-removal` runs as WASM in
 * the browser. The source image is not sent to any background-removal API.
 */
export function ClientVehicleUpload({
  vehicleId,
  tagUuid,
  onUploaded,
  onSkip,
  skipLabel = "Später",
  title = "Fahrzeug-Silhouette",
  description = "Bitte fotografiere dein Fahrzeug exakt von der Seite, damit die Animation im Dashboard gut aussieht.",
  className = "",
}: ClientVehicleUploadProps) {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [removalStatus, setRemovalStatus] = useState<CutoutProgress>({
    label: "Stelle Fahrzeug frei…",
    progress: 0,
  });
  const [uploadProgress, setUploadProgress] = useState(0);

  const busy =
    state === "compressing" || state === "removing" || state === "uploading";

  const barProgress =
    state === "compressing"
      ? 8
      : state === "removing"
        ? Math.max(8, removalStatus.progress)
        : state === "uploading"
          ? Math.max(8, uploadProgress)
          : 0;

  const loadingText =
    state === "compressing"
      ? "Bild wird vorbereitet…"
      : state === "removing"
        ? removalStatus.label
        : "Bild wird gespeichert…";

  const [preloadReady, setPreloadReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void preloadVehicleBackgroundRemoval()
      .then(() => {
        if (!cancelled) setPreloadReady(true);
      })
      .catch((error) => {
        console.warn("[vehicle-cutout] preload failed", error);
        if (!cancelled) setPreloadReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setNotice(null);
      setState("compressing");
      setRemovalStatus({ label: "Bild wird vorbereitet…", progress: 4 });
      setUploadProgress(0);

      let compressed: File;
      try {
        compressed = await compressSilhouetteImage(file);
      } catch (error) {
        setState("idle");
        setError(
          error instanceof SilhouetteCompressionError
            ? error.message
            : "Bild konnte nicht vorbereitet werden.",
        );
        return;
      }

      const compressPreview = URL.createObjectURL(compressed);
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return compressPreview;
      });

      setState("removing");
      setRemovalStatus({ label: "Lade lokale KI-Freistellung…", progress: 6 });

      let uploadFile: File = compressed;
      let backgroundRemoved = false;

      try {
        const cutout = await removeVehicleBackground(compressed, {
          onProgress: setRemovalStatus,
        });

        const baseName = compressed.name.replace(/\.[^.]+$/, "") || "vehicle-side";
        uploadFile = await shrinkCutoutPng(
          await toPngFile(cutout, baseName),
        );
        backgroundRemoved = true;

        const cutoutPreview = URL.createObjectURL(uploadFile);
        setPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return cutoutPreview;
        });
      } catch (removalError) {
        console.error("[vehicle-cutout] local removal failed", removalError);
        const reason =
          removalError instanceof Error ? removalError.message : null;
        const isolationHint = !isCrossOriginIsolated()
          ? " Seite muss über HTTPS mit Cross-Origin-Isolation laufen."
          : "";
        setNotice(
          reason
            ? `Freistellung fehlgeschlagen: ${reason}${isolationHint} Originalbild wird gespeichert.`
            : `Lokale Freistellung nicht möglich — Originalbild wird gespeichert.${isolationHint}`,
        );
      }

      setState("uploading");
      setUploadProgress(8);
      try {
        const body = new FormData();
        body.append("vehicleId", vehicleId);
        body.append("tagUuid", tagUuid);
        body.append("backgroundRemoved", String(backgroundRemoved));
        body.append("file", uploadFile, uploadFile.name || "vehicle-side.png");

        const { ok, status, payload } = await uploadWithProgress(
          "/api/vehicle/remove-bg",
          body,
          setUploadProgress,
        );

        if (!ok || !payload?.ok || !payload.silhouetteImageUrl) {
          throw new Error(
            payload?.error ??
              `Upload fehlgeschlagen (${status || "netzwerk"}).`,
          );
        }

        setUploadProgress(100);
        const preview =
          payload.silhouetteDisplayUrl ?? payload.silhouetteImageUrl;
        setPreviewUrl((previous) => {
          if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
          return preview ?? previous;
        });
        setState("done");
        onUploaded?.(payload.silhouetteImageUrl);
        router.refresh();
      } catch (error) {
        setState("idle");
        setError(
          error instanceof Error
            ? error.message
            : "Upload fehlgeschlagen. Bitte erneut versuchen.",
        );
      }
    },
    [onUploaded, router, tagUuid, vehicleId],
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
        {!preloadReady ? (
          <span className="mt-1 block text-[0.78rem]">
            KI-Modell wird vorbereitet…
          </span>
        ) : null}
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
        className={`relative mt-4 flex min-h-[11rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-4 py-6 transition-colors ${
          dragOver
            ? "border-neutral-900 bg-neutral-900/[0.04]"
            : "border-[color:var(--vd-border)] bg-[color:var(--vd-bg)]"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        <VehicleSilhouette
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-1/2 h-20 -translate-y-1/2 text-[color:var(--vd-muted)] opacity-[0.18] sm:h-24"
        />

        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Vorschau Seitenansicht"
            className="relative z-[1] max-h-28 w-auto object-contain"
          />
        ) : (
          <div className="relative z-[1] flex flex-col items-center gap-2 text-center">
            <ImagePlus className="h-6 w-6 text-[color:var(--vd-muted)]" aria-hidden />
            <p className="text-[0.85rem] font-medium text-[color:var(--vd-text)]">
              Foto wählen oder hierher ziehen
            </p>
            <p className="text-[0.75rem] text-[color:var(--vd-muted)]">
              Seitenansicht · Galerie oder Kamera
            </p>
          </div>
        )}

        {busy ? (
          <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 bg-[color:var(--vd-surface)]/80 px-5 text-center">
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
            {state === "removing" ? (
              <p className="text-[0.72rem] text-[color:var(--vd-muted)]">
                KI läuft auf diesem Gerät — dein Foto wird nicht an einen Freistellungsdienst gesendet.
              </p>
            ) : null}
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
            {previewUrl ? "Anderes aus Galerie" : "Galerie"}
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

      {notice ? (
        <p className="mt-3 text-[0.85rem] text-amber-800" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[0.85rem] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {state === "done" ? (
        <p className="mt-3 text-[0.85rem] text-emerald-700" role="status">
          Silhouette gespeichert — sie rollt im Dashboard ein.
        </p>
      ) : null}
    </section>
  );
}
