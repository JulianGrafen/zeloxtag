"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Loader2, SkipForward } from "lucide-react";
import type { Config } from "@imgly/background-removal";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import { VehicleSilhouette } from "@/components/vehicle-dashboard/VehicleSilhouette";
import {
  compressSilhouetteImage,
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

type RemovalStatus = {
  label: string;
  progress: number | null;
};

const IMAGE_ACCEPT = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";
const LOCAL_REMOVAL_TIMEOUT_MS = 120_000;

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

function progressLabel(key: string, current: number, total: number): RemovalStatus {
  const percent =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : null;
  const normalizedKey = key.toLowerCase();

  if (normalizedKey.includes("model") || normalizedKey.includes("isnet")) {
    return {
      label: percent == null ? "Lade KI-Modell…" : `Lade KI-Modell (${percent}%)`,
      progress: percent,
    };
  }

  return {
    label: percent == null ? "Bereite KI-Freistellung vor…" : `Lade Freistellung (${percent}%)`,
    progress: percent,
  };
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(
      () => reject(new Error("Lokale Freistellung hat zu lange gedauert.")),
      ms,
    );
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
  const [removalStatus, setRemovalStatus] = useState<RemovalStatus>({
    label: "Stelle Fahrzeug frei…",
    progress: null,
  });

  const busy =
    state === "compressing" || state === "removing" || state === "uploading";

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setNotice(null);
      setState("compressing");

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

      setState("removing");
      setRemovalStatus({ label: "Lade lokale KI-Freistellung…", progress: 0 });

      let uploadFile: File = compressed;
      let backgroundRemoved = false;

      try {
        const { removeBackground: imglyRemoveBackground } = await import(
          "@imgly/background-removal"
        );

        const config: Config = {
          model: "isnet_quint8",
          device: "cpu",
          proxyToWorker: true,
          output: { format: "image/png", quality: 1 },
          progress: (key, current, total) => {
            setRemovalStatus(progressLabel(key, current, total));
          },
        };

        setRemovalStatus({ label: "Stelle Fahrzeug lokal frei…", progress: 100 });
        const cutout = await Promise.race([
          imglyRemoveBackground(compressed, config),
          timeoutAfter(LOCAL_REMOVAL_TIMEOUT_MS),
        ]);

        uploadFile = new File(
          [cutout],
          `${compressed.name.replace(/\.[^.]+$/, "")}-cutout.png`,
          { type: "image/png", lastModified: Date.now() },
        );
        backgroundRemoved = true;
      } catch {
        setNotice(
          "Die lokale Freistellung war auf diesem Gerät nicht möglich. Das Originalbild wird stattdessen gespeichert.",
        );
      }

      const localPreview = URL.createObjectURL(uploadFile);
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return localPreview;
      });

      setState("uploading");
      try {
        const body = new FormData();
        body.set("vehicleId", vehicleId);
        body.set("tagUuid", tagUuid);
        body.set("backgroundRemoved", String(backgroundRemoved));
        body.set("file", uploadFile);

        const response = await fetch("/api/vehicle/remove-bg", {
          method: "POST",
          body,
        });
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          silhouetteImageUrl?: string;
        } | null;

        if (!response.ok || !payload?.ok || !payload.silhouetteImageUrl) {
          throw new Error(payload?.error ?? "Upload fehlgeschlagen.");
        }

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

  const loadingText =
    state === "compressing"
      ? "Bild wird vorbereitet…"
      : state === "removing"
        ? removalStatus.label
        : "Bild wird sicher gespeichert…";

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
            {state === "removing" && removalStatus.progress != null ? (
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-neutral-900 transition-[width]"
                  style={{ width: `${removalStatus.progress}%` }}
                />
              </div>
            ) : null}
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
