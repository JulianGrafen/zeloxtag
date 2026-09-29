"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";

import {
  compressSilhouetteImage,
  SilhouetteCompressionError,
} from "@/lib/vehicles/compress-silhouette-image";
import { cn } from "@/lib/utils";

const IMAGE_ACCEPT = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";

type ClaimVehiclePhotoPickerProps = {
  previewUrl: string | null;
  onPreviewChange: (url: string | null) => void;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
  /** When true, large frame is hidden — photo is shown in the wizard header preview. */
  compactWhenPreview?: boolean;
};

export function ClaimVehiclePhotoPicker({
  previewUrl,
  onPreviewChange,
  onFileChange,
  disabled = false,
  className,
  compactWhenPreview = true,
}: ClaimVehiclePhotoPickerProps) {
  const showLargeFrame = !compactWhenPreview || !previewUrl;
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(blobRef.current);
      }
    };
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setPreparing(true);
      try {
        const compressed = await compressSilhouetteImage(file);
        if (blobRef.current?.startsWith("blob:")) {
          URL.revokeObjectURL(blobRef.current);
        }
        const local = URL.createObjectURL(compressed);
        blobRef.current = local;
        onPreviewChange(local);
        onFileChange(compressed);
      } catch (compressError) {
        onFileChange(null);
        onPreviewChange(null);
        setError(
          compressError instanceof SilhouetteCompressionError
            ? compressError.message
            : "Foto konnte nicht vorbereitet werden.",
        );
      } finally {
        setPreparing(false);
      }
    },
    [onFileChange, onPreviewChange],
  );

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void processFile(file);
  }

  return (
    <div className={cn("grid gap-4", className)}>
      {showLargeFrame ? (
        <div
          className="relative mx-auto aspect-[4/3] w-full max-w-[16rem] overflow-hidden rounded-[1.1rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] shadow-[var(--vd-shadow-sm)]"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Vorschau Fahrzeugfoto"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <ImagePlus
                className="h-8 w-8 text-[color:var(--vd-muted)]"
                aria-hidden
              />
              <p className="text-[0.85rem] font-medium text-[color:var(--vd-text)]">
                Foto aus Galerie oder Kamera
              </p>
            </div>
          )}
          {preparing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--vd-bg)]/70">
              <Loader2 className="h-7 w-7 animate-spin text-[color:var(--vd-muted)]" />
            </div>
          ) : null}
        </div>
      ) : preparing ? (
        <div className="flex items-center justify-center gap-2 py-2 text-[0.82rem] text-[color:var(--vd-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Foto wird vorbereitet…
        </div>
      ) : (
        <p className="text-center text-[0.82rem] text-[color:var(--vd-muted)]">
          Dein Foto siehst du oben in der Vorschau. Du kannst hier ein anderes
          Bild wählen.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label
          className={cn(
            "claim-back inline-flex flex-1 cursor-pointer items-center justify-center gap-2 py-3",
            disabled || preparing ? "pointer-events-none opacity-60" : "",
          )}
        >
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            disabled={disabled || preparing}
            className="sr-only"
            onChange={onInputChange}
          />
          <ImagePlus className="h-4 w-4" aria-hidden />
          Galerie
        </label>
        <label
          className={cn(
            "claim-back inline-flex flex-1 cursor-pointer items-center justify-center gap-2 py-3",
            disabled || preparing ? "pointer-events-none opacity-60" : "",
          )}
        >
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            capture="environment"
            disabled={disabled || preparing}
            className="sr-only"
            onChange={onInputChange}
          />
          <Camera className="h-4 w-4" aria-hidden />
          Kamera
        </label>
      </div>

      {error ? (
        <p role="alert" className="vd-alert-error text-center text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
