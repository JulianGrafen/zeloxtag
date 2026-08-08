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

import {
  buildA4ImageFromGuideCapture,
  buildA4ImageFromPhotoFile,
  buildA4PdfFromGuideCapture,
  buildA4PdfFromPhotoFile,
  mapContainerRectToVideoCrop,
} from "@/lib/utils/a4-auto-scan";

export type GuideFrameType = "a4" | "section" | "none";
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
  /** Semi-transparent example text centered in the guide frame. */
  guideWatermark?: ReactNode;
  /** Viewfinder guide shape. `none` = full-screen, no overlay frame. */
  guideFrame?: GuideFrameType;
  /** Dim area outside the guide frame. Default: false (transparent). */
  guideFrameDimOutside?: boolean;
  /**
   * With `guideFrame="a4"`: crop the guide frame from the capture,
   * auto-straighten and return an A4 JPEG (default) or PDF.
   */
  a4AutoCrop?: boolean;
  /** Output format for A4 auto-crop captures. Default: jpeg. */
  a4OutputFormat?: "jpeg" | "pdf";
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

function GuideFrameWatermark({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 py-10">
      <p className="pointer-events-none select-none whitespace-pre-wrap text-center font-mono text-[clamp(1rem,4.8vw,1.65rem)] font-semibold leading-snug tracking-wide text-white/28 [text-shadow:0_1px_16px_rgba(0,0,0,0.55)]">
        {children}
      </p>
    </div>
  );
}

function GuideFrameCorners({ sharp = false }: { sharp?: boolean }) {
  const radius = sharp ? "rounded-sm" : "rounded-xl";
  const corner = sharp ? "h-5 w-5" : "h-6 w-6";
  return (
    <>
      <span className={`absolute -left-px -top-px ${corner} ${radius} border-l-4 border-t-4 border-white/85`} />
      <span className={`absolute -right-px -top-px ${corner} ${radius} border-r-4 border-t-4 border-white/85`} />
      <span className={`absolute -bottom-px -left-px ${corner} ${radius} border-b-4 border-l-4 border-white/85`} />
      <span className={`absolute -bottom-px -right-px ${corner} ${radius} border-b-4 border-r-4 border-white/85`} />
    </>
  );
}

function guideFrameOutsideShadow(dimOutside: boolean): string {
  return dimOutside ? "shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" : "";
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
  guideWatermark,
  guideFrame = "section",
  guideFrameDimOutside = false,
  a4AutoCrop = true,
  a4OutputFormat = "jpeg",
  guideSectionAnchor = "center",
  allowPdf = false,
  showBriefing = true,
  continuousCapture = false,
  captureStep,
}: InBrowserCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const guideFrameRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [processingCapture, setProcessingCapture] = useState(false);
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

  async function deliverCaptureFile(file: File) {
    onCapture(file);
    if (continuousCapture) {
      setCaptureFlash(true);
      window.setTimeout(() => setCaptureFlash(false), 140);
    }
  }

  async function processA4GuideCapture(
    fullCapture: HTMLCanvasElement,
    layout: {
      videoWidth: number;
      videoHeight: number;
      container: DOMRect;
      guide: DOMRect;
    },
  ): Promise<File> {
    const crop = mapContainerRectToVideoCrop(
      layout.videoWidth,
      layout.videoHeight,
      {
        left: layout.container.left,
        top: layout.container.top,
        width: layout.container.width,
        height: layout.container.height,
      },
      {
        left: layout.guide.left,
        top: layout.guide.top,
        width: layout.guide.width,
        height: layout.guide.height,
      },
    );

    if (crop.sw < 8 || crop.sh < 8) {
      throw new Error(
        "A4-Rahmen zu klein — bitte näher heran oder Rahmen neu ausrichten.",
      );
    }

    return a4OutputFormat === "pdf"
      ? (
          await buildA4PdfFromGuideCapture(fullCapture, crop)
        ).file
      : buildA4ImageFromGuideCapture(fullCapture, crop);
  }

  function readA4CaptureLayout():
    | {
        videoWidth: number;
        videoHeight: number;
        container: DOMRect;
        guide: DOMRect;
      }
    | null {
    const video = videoRef.current;
    const viewfinder = viewfinderRef.current;
    const guide = guideFrameRef.current;
    if (!video || !viewfinder || !guide) return null;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (videoWidth < 1 || videoHeight < 1) return null;

    return {
      videoWidth,
      videoHeight,
      container: viewfinder.getBoundingClientRect(),
      guide: guide.getBoundingClientRect(),
    };
  }

  async function handleCapture() {
    if (!videoRef.current || capturing || processingCapture || !cameraReady) {
      return;
    }

    const shouldA4Crop = a4AutoCrop && guideFrame === "a4";
    const a4Layout = shouldA4Crop ? readA4CaptureLayout() : null;
    if (shouldA4Crop && !a4Layout) {
      setCameraError(
        "A4-Rahmen nicht bereit — bitte kurz warten und erneut auslösen.",
      );
      return;
    }

    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available.");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (shouldA4Crop && a4Layout) {
        setProcessingCapture(true);
        try {
          const a4File = await processA4GuideCapture(canvas, a4Layout);
          await deliverCaptureFile(a4File);
        } finally {
          setProcessingCapture(false);
        }
      } else {
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

        const file = new File([blob], `scan-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        await deliverCaptureFile(file);
      }

      canvas.width = 0;
      canvas.height = 0;
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Aufnahme fehlgeschlagen.",
      );
    } finally {
      setCapturing(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (
      a4AutoCrop &&
      guideFrame === "a4" &&
      !file.type.includes("pdf") &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setProcessingCapture(true);
      try {
        const outputFile =
          a4OutputFormat === "pdf"
            ? await buildA4PdfFromPhotoFile(file)
            : await buildA4ImageFromPhotoFile(file);
        await deliverCaptureFile(outputFile);
      } catch (error) {
        setCameraError(
          error instanceof Error
            ? error.message
            : "Bild konnte nicht verarbeitet werden.",
        );
      } finally {
        setProcessingCapture(false);
      }
      return;
    }

    await deliverCaptureFile(file);
  }

  const fileAccept = allowPdf ? PDF_ACCEPT : IMAGE_ACCEPT;

  const frameOutsideShadow = guideFrameOutsideShadow(guideFrameDimOutside);
  const chromeTopPad =
    "max(3.25rem, calc(env(safe-area-inset-top) + 2.75rem))";
  const chromeBottomPad =
    "max(4.75rem, calc(env(safe-area-inset-bottom) + 3.75rem))";

  const topBar = (
    <div className="pointer-events-auto relative flex shrink-0 items-center justify-between px-3 pb-2 pt-[max(0.35rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-[2px] transition-opacity active:opacity-60"
        aria-label="Schließen"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute left-1/2 top-1/2 w-[min(84vw,24rem)] -translate-x-1/2 -translate-y-1/2 text-center">
        {captureStep ? (
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
            Schritt {captureStep.current} von {captureStep.total}
          </p>
        ) : null}
        <p className="text-[0.8rem] font-semibold leading-snug text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          {title}
        </p>
        {hint && !instructionsOpen ? (
          <p className="mt-0.5 line-clamp-2 text-[0.65rem] leading-snug text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
            {hint}
          </p>
        ) : null}
      </div>

      <label
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-[2px] transition-opacity active:opacity-60"
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
  );

  const bottomControls =
    !cameraError && !instructionsOpen && !processingCapture ? (
      <div className="pointer-events-auto flex shrink-0 items-center justify-center gap-6 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {hasMultipleCameras ? (
          <button
            type="button"
            onClick={() => void flipCamera()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-[2px] transition-opacity active:opacity-60"
            aria-label="Kamera wechseln"
          >
            <FlipHorizontal2 className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-11 w-11" aria-hidden />
        )}

        <button
          type="button"
          onClick={() => void handleCapture()}
          disabled={!cameraReady || capturing || processingCapture}
          className="flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border-4 border-white/95 shadow-[0_2px_18px_rgba(0,0,0,0.45)] transition-transform active:scale-90 disabled:opacity-40"
          aria-label="Foto aufnehmen"
        >
          <span className="h-[3.25rem] w-[3.25rem] rounded-full bg-white transition-transform active:scale-90" />
        </button>

        {continuousCapture ? (
          <label
            className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-[2px] transition-opacity active:opacity-60"
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
        ) : (
          <div className="h-11 w-11" aria-hidden />
        )}
      </div>
    ) : null;

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen flex-col bg-black">
      {/* ── Viewfinder (full bleed) ──────────────────────────────────── */}
      <div ref={viewfinderRef} className="absolute inset-0 overflow-hidden">
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

            {/* Document guide frame (optional) */}
            {cameraReady && guideFrame !== "none" ? (
              guideFrame === "a4" ? (
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center px-2"
                  style={{
                    paddingTop: chromeTopPad,
                    paddingBottom: chromeBottomPad,
                  }}
                >
                  <div
                    ref={guideFrameRef}
                    className={[
                      "relative h-full w-auto max-h-full max-w-[92vw] shrink-0 rounded-xl border-2 border-white/80",
                      frameOutsideShadow,
                    ].join(" ")}
                    style={{ aspectRatio: A4_ASPECT_RATIO }}
                    aria-hidden
                  >
                    <GuideFrameCorners />
                    <div className="absolute left-3 top-3 rounded-md bg-black/40 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/90">
                      DIN A4
                    </div>
                    {guideWatermark ? (
                      <GuideFrameWatermark>{guideWatermark}</GuideFrameWatermark>
                    ) : null}
                    {guideLabel ? (
                      <div className="absolute inset-x-2 bottom-3 flex justify-center">
                        <span className="rounded-lg bg-black/55 px-3 py-1.5 text-center text-[0.75rem] font-medium leading-snug text-white backdrop-blur-[2px]">
                          {guideLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  className={[
                    "pointer-events-none absolute inset-0 flex px-3",
                    sectionFrameLayoutClass(guideSectionAnchor),
                  ].join(" ")}
                  style={{
                    paddingTop: chromeTopPad,
                    paddingBottom: chromeBottomPad,
                  }}
                >
                  <div
                    className={[
                      "relative w-full max-w-[min(96vw,560px)] rounded-md border-2 border-white/75",
                      frameOutsideShadow,
                    ].join(" ")}
                    style={{ aspectRatio: SECTION_ASPECT_RATIOS[guideSectionAnchor] }}
                    aria-hidden
                  >
                    <GuideFrameCorners sharp />
                    {guideWatermark ? (
                      <GuideFrameWatermark>{guideWatermark}</GuideFrameWatermark>
                    ) : null}
                    {guideLabel ? (
                      <div className="absolute inset-x-2 bottom-3 flex justify-center">
                        <span className="rounded-lg bg-black/55 px-3 py-1.5 text-center text-[0.75rem] font-medium leading-snug text-white backdrop-blur-[2px]">
                          {guideLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            ) : null}

            {processingCapture ? (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center backdrop-blur-[2px]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                <p className="text-[0.9rem] font-semibold text-white">
                  {a4OutputFormat === "pdf" ? "A4-Zuschnitt & PDF…" : "A4-Autozoom…"}
                </p>
                <p className="text-[0.75rem] text-white/80">
                  Rechnung wird auf den Papierbereich zugeschnitten
                </p>
              </div>
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

        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
          {topBar}
          <div className="flex-1" />
          {bottomControls}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return overlay;
  }

  return createPortal(overlay, document.body);
}
