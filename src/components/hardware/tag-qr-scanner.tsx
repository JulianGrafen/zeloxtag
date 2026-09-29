"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera } from "lucide-react";

import { parseTagUuidFromScanPayload } from "@/lib/tags/parse-tag-scan-payload";

type TagQrScannerProps = {
  active: boolean;
  onTagScanned: (tagUuid: string) => void;
  onScanError?: (message: string) => void;
};

export function TagQrScanner({
  active,
  onTagScanned,
  onScanError,
}: TagQrScannerProps) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const onTagScannedRef = useRef(onTagScanned);
  const onScanErrorRef = useRef(onScanError);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  onTagScannedRef.current = onTagScanned;
  onScanErrorRef.current = onScanError;

  useEffect(() => {
    if (!active) {
      handledRef.current = false;
      return;
    }

    let cancelled = false;

    async function startScanner() {
      setStarting(true);
      setCameraError(null);
      handledRef.current = false;

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (handledRef.current) return;
            const tagUuid = parseTagUuidFromScanPayload(decodedText);
            if (!tagUuid) {
              onScanErrorRef.current?.(
                "QR erkannt, aber keine gültige Zelox-Tag-ID. Bitte die Plaque im Motorraum scannen.",
              );
              return;
            }
            handledRef.current = true;
            void scanner.stop().catch(() => undefined);
            scannerRef.current = null;
            onTagScannedRef.current(tagUuid);
          },
          () => {
            // No QR in frame — expected while aiming.
          },
        );
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Kamera konnte nicht gestartet werden.";
        setCameraError(message);
        onScanErrorRef.current?.(
          "Kamera-Zugriff fehlgeschlagen. Bitte Berechtigung erlauben oder QR erneut versuchen.",
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        void scanner.stop().catch(() => undefined);
        try {
          scanner.clear();
        } catch {
          // ignore
        }
      }
    };
  }, [active, regionId]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[color:var(--vd-border)] bg-black">
      <div id={regionId} className="min-h-[min(72vw,280px)] w-full [&_video]:object-cover" />
      {starting ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
          <p className="flex items-center gap-2 text-[0.82rem] text-white/90">
            <Camera className="h-4 w-4 animate-pulse" aria-hidden />
            Kamera wird gestartet…
          </p>
        </div>
      ) : null}
      {cameraError ? (
        <p className="border-t border-[color:var(--vd-border)] bg-[#141418] px-3 py-2 text-[0.78rem] text-[color:var(--vd-muted)]">
          {cameraError}
        </p>
      ) : null}
    </div>
  );
}
