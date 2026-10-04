"use client";

import { Loader2, Share2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PressableButton } from "@/components/vehicle-dashboard/Pressable";
import type { VehicleRoastResult } from "@/lib/roast/roast-schema";
import {
  downloadRoastStoryImage,
  shareRoastStoryImage,
} from "@/lib/roast/render-roast-story-image";

import { RoastResultView } from "./roast-result-view";
import { RoastScanLoader } from "./roast-scan-loader";

type RoastBuildModalProps = {
  open: boolean;
  vehicleId: string;
  vehicleLabel: string;
  onClose: () => void;
};

type RoastPhase = "idle" | "loading" | "result" | "error";

const ROAST_FETCH_TIMEOUT_MS = 42_000;

export function RoastBuildModal({
  open,
  vehicleId,
  vehicleLabel,
  onClose,
}: RoastBuildModalProps) {
  const [phase, setPhase] = useState<RoastPhase>("idle");
  const [roast, setRoast] = useState<VehicleRoastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharePending, setSharePending] = useState(false);
  const requestGenerationRef = useRef(0);

  const runRoast = useCallback(
    async (signal: AbortSignal) => {
      const generation = requestGenerationRef.current + 1;
      requestGenerationRef.current = generation;

      setPhase("loading");
      setError(null);
      setRoast(null);

      try {
        const response = await fetch(`/api/vehicles/${vehicleId}/roast`, {
          method: "POST",
          credentials: "same-origin",
          signal,
        });

        let json: {
          ok?: boolean;
          error?: string;
          roast?: VehicleRoastResult;
        };
        try {
          json = (await response.json()) as typeof json;
        } catch {
          if (generation !== requestGenerationRef.current) return;
          setError("Ungültige Server-Antwort. Bitte erneut versuchen.");
          setPhase("error");
          return;
        }

        if (generation !== requestGenerationRef.current) return;

        if (!response.ok || !json.ok || !json.roast) {
          setError(json.error ?? "Roast fehlgeschlagen.");
          setPhase("error");
          return;
        }

        setRoast(json.roast);
        setPhase("result");
      } catch (cause) {
        if (generation !== requestGenerationRef.current) return;
        if (cause instanceof DOMException && cause.name === "AbortError") {
          setError("Das hat zu lange gedauert. Bitte erneut versuchen.");
          setPhase("error");
          return;
        }
        setError("Netzwerkfehler. Bitte erneut versuchen.");
        setPhase("error");
      }
    },
    [vehicleId],
  );

  useEffect(() => {
    if (!open) {
      requestGenerationRef.current += 1;
      setPhase("idle");
      setRoast(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, ROAST_FETCH_TIMEOUT_MS);

    void runRoast(controller.signal).finally(() => {
      window.clearTimeout(timeoutId);
    });

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [open, runRoast]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const showLoader = phase === "loading" || phase === "idle";
  const showResult = phase === "result" && roast;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roast-modal-title"
    >
      <div
        className="grid h-[92dvh] max-h-[92dvh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-3xl border border-[#ff3366]/25 bg-[#0a0a10] shadow-2xl sm:h-auto sm:max-h-[min(92dvh,40rem)] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2
            id="roast-modal-title"
            className="text-[0.95rem] font-semibold text-[#f5f5fa]"
          >
            Roast My Build
          </h2>
          <PressableButton
            type="button"
            aria-label="Schließen"
            className="rounded-full p-2 text-[#a0a0b0]"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </PressableButton>
        </header>

        <div
          className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-4 [-webkit-overflow-scrolling:touch]"
          style={{
            paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
          }}
        >
          {showLoader ? <RoastScanLoader /> : null}

          {phase === "error" ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#12121a] p-4">
              <p className="text-[0.9rem] text-[#f5f5fa]">{error}</p>
              <PressableButton
                type="button"
                className="w-full rounded-xl bg-[#ff3366] py-3 text-[0.88rem] font-semibold text-white"
                onClick={() => {
                  const controller = new AbortController();
                  const timeoutId = window.setTimeout(
                    () => controller.abort(),
                    ROAST_FETCH_TIMEOUT_MS,
                  );
                  void runRoast(controller.signal).finally(() => {
                    window.clearTimeout(timeoutId);
                  });
                }}
              >
                Erneut versuchen
              </PressableButton>
            </div>
          ) : null}

          {showResult ? (
            <div className="flex flex-col gap-4">
              <RoastResultView vehicleLabel={vehicleLabel} roast={roast} />

              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <PressableButton
                  type="button"
                  disabled={sharePending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff3366] to-[#ff6b3d] py-3.5 text-[0.9rem] font-semibold text-white"
                  onClick={() => {
                    setSharePending(true);
                    void shareRoastStoryImage({ vehicleLabel, roast })
                      .catch(() =>
                        downloadRoastStoryImage({ vehicleLabel, roast }),
                      )
                      .finally(() => setSharePending(false));
                  }}
                >
                  {sharePending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Share2 className="h-5 w-5" />
                  )}
                  In Story teilen / Bild speichern
                </PressableButton>
                <PressableButton
                  type="button"
                  className="w-full rounded-xl border border-white/15 py-3 text-[0.85rem] font-medium text-[#c8c8d4]"
                  onClick={onClose}
                >
                  Fertig
                </PressableButton>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
