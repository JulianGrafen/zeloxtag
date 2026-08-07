"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Camera, FileUp, FlipHorizontal2, ImagePlus, X } from "lucide-react";

export type GuideFrameType = "a4" | "section";
export type GuideSectionAnchor = "top" | "center" | "bottom";

export interface InBrowserCameraProps {
  /** Shown in the top bar. */
  title: string;
  /** Optional sub-hint shown below the title. */
  hint?: string;
  /** Called with the captured JPEG or selected file. */
  onCapture: (file: File) => void;
  /** Called when the user dismisses the camera. */
  onClose: () => void;
  /** Overlay message shown inside the viewfinder guide box. */
  guideLabel?: ReactNode;
  /** Viewfinder guide shape. `a4` = full DIN A4 sheet; `section` = smaller crop frame. */
  guideFrame?: GuideFrameType;
  /** Vertical anchor for section frames. Ignored for `a4`. Default: center. */
  guideSectionAnchor?: GuideSectionAnchor;
  /** Allow PDF files in the gallery fallback picker. Default: false. */
  allowPdf?: boolean;
  /** Full-screen briefing card before the viewfinder. Default: true. */
  showBriefing?: boolean;
  /** Keep the live stream open between captures; brief flash instead of remounting. */
  continuousCapture?: boolean;
  /** Optional step indicator, e.g. { current: 2, total: 3 }. */
  captureStep?: { current: number; total: number };
}

type FacingMode = "environment" | "user";

const IMAGE_ACCEPT = "image/*";
const PDF_ACCEPT = "image/*,application/pdf,.pdf";

/** DIN A4 portrait ratio (210 × 297 mm). */
const A4_ASPECT_RATIO = "210 / 297";

/** Landscape crop ratios for guided section scans. */
const SECTION_ASPECT_RATIOS: Record<GuideSectionAnchor, string> = {
  top: "5 / 2", // document header band
  center: "4 / 3", // Punkt 6 defects block
  bottom: "4 / 3",
};

function GuideFrameCorners({ sharp = false }: { sharp?: boolean }) {
  const radius = sharp ? "rounded-sm" : "rounded-xl";
  const corner = sharp ? "h-5 w-5" : "h-6 w-6";
  return (
    <>
      <span className={`absolute -left-px -top-px ${corner} ${radius} border-l-4 border-t-4 border-white`} />
      <span className={`absolute -right-px -top-px ${corner} ${radius} border-r-4 border-t-4 border-white`} />
      <span className={`absolute -bottom-px -left-px ${corner} ${radius} border-b-4 border-l-4 border-white`} />
      <span className={`absolute -bottom-px -right-px ${corner} ${radius} border-b-4 border-r-4 border-white`} />
    </>
  );
}

function sectionFrameLayoutClass(anchor: GuideSectionAnchor): string {
  switch (anchor) {
    case "top":
      return "items-start justify-center pt-[13%]";
    case "bottom":
      return "items-end justify-center pb-[18%]";
    default:
      return "items-center justify-center";
  }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * Full-screen in-browser camera overlay using `getUserMedia`.
 *
 * Renders a live `<video>` viewfinder with a shutter button instead of
 * delegating to the device's native camera app. Falls back to a file
 * picker when camera permission is unavailable.
 */
export function InBrowserCamera({
  title,
  hint,
  onCapture,
  onClose,
  guideLabel,
  guideFrame = "section",
  guideSectionAnchor = "center",
  allowPdf = false,
  showBriefing = true,
  continuousCapture = false,
  captureStep,
}: InBrowserCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(
    Boolean(hint && showBriefing && !continuousCapture),
  );
  const [captureFlash, setCaptureFlash] = useState(false);

  useEffect(() => {
    if (continuousCapture) {
      setInstructionsOpen(false);
      return;
    }
    setInstructionsOpen(Boolean(hint && showBriefing));
  }, [title, hint, showBriefing, continuousCapture]);

  async function startCamera(facing: FacingMode) {
    stopStream(streamRef.current);
    streamRef.current = null;
    setCameraReady(false);
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "In-Browser-Kamera wird von diesem Browser nicht unterstützt.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);

      // Check if multiple cameras are available for flip button.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput",
        );
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        // Non-critical — skip flip button.
      }
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraError(
          "Kamerazugriff verweigert. Bitte in den Browser-Einstellungen erlauben.",
        );
      } else if (name === "NotFoundError") {
        setCameraError("Keine Kamera gefunden.");
      } else {
        setCameraError("Kamera konnte nicht gestartet werden.");
      }
    }
  }

  useEffect(() => {
    void startCamera(facingMode);
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
    // Intentionally only on mount — facingMode changes handled by flipCamera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function flipCamera() {
    const next: FacingMode =
      facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    await startCamera(next);
  }

  async function handleCapture() {
    if (!videoRef.current || capturing || !cameraReady) return;
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available.");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) =>
            b
              ? resolve(b)
              : reject(new Error("Aufnahme fehlgeschlagen.")),
          "image/jpeg",
          0.92,
        );
      });

      // Release canvas memory.
      canvas.width = 0;
      canvas.height = 0;

      const file = new File([blob], `scan-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      onCapture(file);
      if (continuousCapture) {
        setCaptureFlash(true);
        window.setTimeout(() => setCaptureFlash(false), 140);
      }
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Aufnahme fehlgeschlagen.",
      );
    } finally {
      setCapturing(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onCapture(file);
      event.target.value = "";
    }
  }

  const fileAccept = allowPdf ? PDF_ACCEPT : IMAGE_ACCEPT;

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-between px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-opacity active:opacity-60"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="absolute left-1/2 top-1/2 w-[min(72vw,20rem)] -translate-x-1/2 -translate-y-1/2 text-center">
          {captureStep ? (
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/70">
              Schritt {captureStep.current} von {captureStep.total}
            </p>
          ) : null}
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>

        {/* Gallery / file fallback */}
        <label
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-opacity active:opacity-60"
          aria-label="Aus Galerie oder Datei wählen"
        >
          <input
            type="file"
            accept={fileAccept}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={handleFileChange}
          />
          {allowPdf ? (
            <FileUp className="h-5 w-5" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </label>
      </div>

      {hint && !instructionsOpen ? (
        <div className="border-b border-white/10 bg-white px-5 py-3.5 shadow-lg">
          <p className="mx-auto max-w-lg text-center text-[0.88rem] font-medium leading-relaxed text-neutral-900">
            {hint}
          </p>
        </div>
      ) : null}

      {/* ── Viewfinder ───────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {cameraError ? (
          /* Error state — show file picker only */
          <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Camera className="h-8 w-8 text-white/40" />
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              {cameraError}
            </p>
            {hint ? (
              <div className="rounded-2xl bg-white px-5 py-4 text-left shadow-lg">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Scan-Hinweis
                </p>
                <p className="mt-2 text-[0.9rem] font-medium leading-relaxed text-neutral-900">
                  {hint}
                </p>
              </div>
            ) : null}
            <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black">
              <input
                type="file"
                accept={fileAccept}
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={handleFileChange}
              />
              <ImagePlus className="h-4 w-4" />
              Datei auswählen
            </label>
          </div>
        ) : (
          <>
            {/* Live video stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={[
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                cameraReady ? "opacity-100" : "opacity-0",
              ].join(" ")}
            />

            {/* Loading spinner */}
            {!cameraReady ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            ) : null}

            {/* Document guide frame */}
            {cameraReady ? (
              guideFrame === "a4" ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5 py-4">
                  <div
                    className="relative w-full max-w-[min(92vw,calc((100dvh-220px)*210/297))] rounded-xl border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                    style={{ aspectRatio: A4_ASPECT_RATIO }}
                    aria-hidden
                  >
                    <GuideFrameCorners />
                    <div className="absolute left-3 top-3 rounded-md bg-black/45 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm">
                      DIN A4
                    </div>
                    {guideLabel ? (
                      <div className="absolute inset-x-2 bottom-3 flex justify-center">
                        <span className="rounded-xl bg-white/95 px-3 py-2 text-center text-[0.78rem] font-semibold leading-snug text-neutral-900 shadow-lg">
                          {guideLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  className={[
                    "pointer-events-none absolute inset-0 flex px-6 py-4",
                    sectionFrameLayoutClass(guideSectionAnchor),
                  ].join(" ")}
                >
                  <div
                    className="relative w-full max-w-[min(90vw,520px)] rounded-md border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                    style={{ aspectRatio: SECTION_ASPECT_RATIOS[guideSectionAnchor] }}
                    aria-hidden
                  >
                    <GuideFrameCorners sharp />
                    {guideLabel ? (
                      <div className="absolute inset-x-2 bottom-3 flex justify-center">
                        <span className="rounded-xl bg-white/95 px-3 py-2 text-center text-[0.78rem] font-semibold leading-snug text-neutral-900 shadow-lg">
                          {guideLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            ) : null}

            {captureFlash ? (
              <div className="pointer-events-none absolute inset-0 z-30 bg-white/70 transition-opacity duration-150" />
            ) : null}

            {hint && instructionsOpen ? (
              <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/70 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Scan-Hinweis
                  </p>
                  <p className="mt-2 text-[1.05rem] font-semibold leading-snug text-neutral-900">
                    {title}
                  </p>
                  <p className="mt-3 text-[0.92rem] leading-relaxed text-neutral-700">
                    {hint}
                  </p>
                  {guideLabel ? (
                    <p className="mt-4 rounded-xl bg-neutral-100 px-3 py-2 text-[0.82rem] font-medium text-neutral-800">
                      Im Rahmen sichtbar: {guideLabel}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setInstructionsOpen(false)}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 py-3.5 text-[0.92rem] font-semibold text-white transition-opacity active:opacity-80"
                  >
                    Verstanden — Kamera öffnen
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ── Bottom controls ───────────────────────────────────────── */}
      {!cameraError && !instructionsOpen ? (
        <div className="flex items-center justify-center gap-8 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* Camera flip (only when multiple cameras detected) */}
          {hasMultipleCameras ? (
            <button
              type="button"
              onClick={() => void flipCamera()}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-opacity active:opacity-60"
              aria-label="Kamera wechseln"
            >
              <FlipHorizontal2 className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-12 w-12" aria-hidden />
          )}

          {/* Shutter button */}
          <button
            type="button"
            onClick={() => void handleCapture()}
            disabled={!cameraReady || capturing}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-transform active:scale-90 disabled:opacity-40"
            aria-label="Foto aufnehmen"
          >
            <span className="h-14 w-14 rounded-full bg-white transition-transform active:scale-90" />
          </button>

          {/* Spacer mirror for flip button */}
          <div className="h-12 w-12" aria-hidden />
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") {
    return overlay;
  }

  return createPortal(overlay, document.body);
}
