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
  buildImageFromGuideCapture,
  mapContainerRectToVideoCrop,
} from "@/lib/utils/a4-auto-scan";
import {
  ABE_CAPTURE_JPEG_QUALITY,
  ABE_CAPTURE_MAX_WIDTH_PX,
  encodeAbeCaptureCanvas,
  resizeDocumentCanvas,
  resizeDocumentImage,
} from "@/lib/utils/image-optimizer";
import {
  analyzeCaptureQuality,
  captureQualityMessage,
  type CaptureQualityMetrics,
} from "@/lib/utils/capture-quality-gate";
import {
  analyzeInvoiceCaptureFraming,
  type InvoiceFramingMetrics,
} from "@/lib/utils/invoice-capture-framing";

export type GuideFrameType = "a4" | "section" | "table" | "none";
export type GuideSectionAnchor = "top" | "center" | "bottom";

export interface InBrowserCameraProps {
  /** Shown in the top bar. */
  title: string;
  /**
   * What to scan — always rendered directly above the shutter.
   * Compact chrome still shows this (parent HUDs must not duplicate it).
   */
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
   * Crop the guide frame from the capture. `a4` is auto-straightened to A4;
   * `table` keeps the landscape excerpt.
   */
  a4AutoCrop?: boolean;
  /** Output format for A4 auto-crop captures. Default: jpeg. */
  a4OutputFormat?: "jpeg" | "pdf";
  /** Vertical anchor for section frames. Ignored for `a4`. Default: center. */
  guideSectionAnchor?: GuideSectionAnchor;
  /** Allow PDF files in the gallery fallback picker. Default: false. */
  allowPdf?: boolean;
  /** Full-screen briefing card before the viewfinder. Default: false. */
  showBriefing?: boolean;
  /** Keep the live stream open between captures; brief flash instead of remounting. */
  continuousCapture?: boolean;
  /** Optional step indicator, e.g. { current: 2, total: 3 }. */
  captureStep?: { current: number; total: number };
  /**
   * Minimal chrome for wizard HUD overlays: no header bar, no hint box, tighter
   * frame padding — progress/close live in the parent overlay.
   */
  compactChrome?: boolean;
  /** Max long edge for JPEG capture (ABE uses ~1600px). */
  captureMaxWidth?: number;
  /** JPEG quality for captures (0–1). */
  captureJpegQuality?: number;
  /** Block upload when frame is blurry or too dark. */
  enforceCaptureQuality?: boolean;
  /**
   * Live distance/zoom hints from A4 guide fill ratio (invoice scans).
   * Requires `guideFrame="a4"`.
   */
  showFramingGuide?: boolean;
  /** Show pinch-style zoom slider when the camera supports optical zoom. */
  allowOpticalZoom?: boolean;
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

/** Wide Verwendungsbereich excerpt (Fahrzeugtyp → Auflagen). */
const TABLE_ASPECT_RATIO = "16 / 7";

/** Fixed viewport — guide frames stay the same size across wizard steps. */
const GUIDE_FRAME_VIEWPORT_CLASS =
  "flex h-[min(68dvh,34rem)] w-[min(92vw,28rem)] shrink-0 items-center justify-center";

const GUIDE_FRAME_INNER_A4_CLASS =
  "relative h-full w-auto min-h-[14rem] min-w-[9.5rem] max-h-full max-w-full shrink-0 border-2 transition-colors duration-200";

const GUIDE_FRAME_INNER_BASE_CLASS =
  "relative max-h-full max-w-full shrink-0 border-2 transition-colors duration-200";

function GuideFrameViewport({
  children,
  chromeTopPad,
  chromeBottomPad,
  layoutClass = "items-center justify-center",
}: {
  children: ReactNode;
  chromeTopPad: string;
  chromeBottomPad: string;
  layoutClass?: string;
}) {
  return (
    <div
      className={[
        "pointer-events-none absolute inset-0 flex px-2",
        layoutClass,
      ].join(" ")}
      style={{
        paddingTop: chromeTopPad,
        paddingBottom: chromeBottomPad,
      }}
    >
      <div className={GUIDE_FRAME_VIEWPORT_CLASS}>{children}</div>
    </div>
  );
}

async function canvasToCaptureFile(
  canvas: HTMLCanvasElement,
  fileName = `scan-${Date.now()}`,
  options: { maxWidth?: number; jpegQuality?: number; abeProfile?: boolean } = {},
): Promise<File> {
  let blob: Blob;
  if (options.abeProfile) {
    const encoded = encodeAbeCaptureCanvas(canvas);
    blob = await fetch(encoded.dataUrl).then((response) => response.blob());
  } else {
    const resized = resizeDocumentCanvas(canvas, options.maxWidth);
    blob = await new Promise<Blob>((resolve, reject) => {
      const finish = (value: Blob | null) => {
        if (value && value.size > 0) {
          resolve(value);
          return;
        }
        try {
          const dataUrl = resized.toDataURL(
            "image/jpeg",
            options.jpegQuality ?? 0.88,
          );
          void fetch(dataUrl)
            .then((response) => response.blob())
            .then(resolve)
            .catch(() =>
              reject(new Error("Aufnahme konnte nicht gespeichert werden.")),
            );
        } catch {
          reject(new Error("Aufnahme konnte nicht gespeichert werden."));
        }
      };

      if (typeof resized.toBlob !== "function") {
        finish(null);
        return;
      }

      try {
        resized.toBlob(finish, "image/jpeg", options.jpegQuality ?? 0.88);
      } catch {
        finish(null);
      }
    });
  }

  return new File([blob], `${fileName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

function GuideFrameWatermark({ children }: { children: ReactNode }) {
  const isPlainText =
    typeof children === "string" || typeof children === "number";

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-2 py-3">
      {isPlainText ? (
        <p className="pointer-events-none max-w-[92%] select-none whitespace-pre-wrap text-center font-mono text-[clamp(1rem,4.8vw,1.65rem)] font-semibold leading-snug tracking-wide text-white/40 [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
          {children}
        </p>
      ) : (
        <div className="pointer-events-none w-full max-w-full select-none px-1">
          {children}
        </div>
      )}
    </div>
  );
}

function GuideFrameCorners({ sharp = false }: { sharp?: boolean }) {
  const radius = sharp ? "rounded-sm" : "rounded-xl";
  const corner = "h-6 w-6";
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

function formatTopBarLabel(
  title: string,
  captureStep?: { current: number; total: number },
): string {
  if (!captureStep) return title;
  const stepLabel = `${captureStep.current}/${captureStep.total}`;
  return title ? `${stepLabel} · ${title}` : stepLabel;
}

function guideFrameBorderClass(captureReady: boolean): string {
  if (captureReady) {
    return "border-emerald-400/95 shadow-[0_0_0_2px_rgba(52,211,153,0.35)]";
  }
  return "border-white/80";
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
  showBriefing = false,
  continuousCapture = false,
  captureStep,
  compactChrome = false,
  captureMaxWidth,
  captureJpegQuality,
  enforceCaptureQuality = false,
  showFramingGuide = false,
  allowOpticalZoom = false,
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
  const [captureFlash, setCaptureFlash] = useState(false);
  const [captureRejectMessage, setCaptureRejectMessage] = useState<string | null>(
    null,
  );
  const captureRejectTimerRef = useRef<number | null>(null);
  const [liveCaptureQuality, setLiveCaptureQuality] =
    useState<CaptureQualityMetrics | null>(null);
  const [liveFraming, setLiveFraming] =
    useState<InvoiceFramingMetrics | null>(null);
  const [opticalZoom, setOpticalZoom] = useState<{
    min: number;
    max: number;
    step: number;
    value: number;
  } | null>(null);
  const captureEncodeOptions = {
    maxWidth: captureMaxWidth,
    jpegQuality: captureJpegQuality,
    abeProfile: captureMaxWidth != null || captureJpegQuality != null,
  };
  const a4EncodeOptions = {
    maxWidth: captureMaxWidth ?? ABE_CAPTURE_MAX_WIDTH_PX,
    jpegQuality: captureJpegQuality ?? ABE_CAPTURE_JPEG_QUALITY,
  };

  const shutterHint = hint === "" ? undefined : hint;
  const resolvedHint = compactChrome ? undefined : shutterHint;
  const topBarLabel = formatTopBarLabel(title, captureStep);
  const showBottomHintPanel =
    !compactChrome &&
    Boolean(
      resolvedHint ||
        enforceCaptureQuality ||
        showFramingGuide ||
        captureStep,
    );
  const shouldShowBriefing = Boolean(
    resolvedHint && showBriefing && !continuousCapture,
  );
  const [instructionsOpen, setInstructionsOpen] = useState(shouldShowBriefing);

  const qualityReady =
    !enforceCaptureQuality || liveCaptureQuality?.isReady === true;
  /** Visual only — shutter stays enabled; post-capture validation rejects bad frames. */
  const frameReady = qualityReady;
  const guideFrameReady = enforceCaptureQuality && frameReady;

  function showCaptureRejectMessage(message: string) {
    if (captureRejectTimerRef.current != null) {
      window.clearTimeout(captureRejectTimerRef.current);
    }
    setCaptureRejectMessage(message);
    captureRejectTimerRef.current = window.setTimeout(() => {
      setCaptureRejectMessage(null);
      captureRejectTimerRef.current = null;
    }, 4500);
  }

  useEffect(() => {
    if (!enforceCaptureQuality || !cameraReady || instructionsOpen) {
      setLiveCaptureQuality(null);
      return;
    }

    let cancelled = false;
    const sample = () => {
      const video = videoRef.current;
      if (!video || video.videoWidth < 8 || video.videoHeight < 8) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const quality = analyzeCaptureQuality(canvas);
      canvas.width = 0;
      canvas.height = 0;
      if (!cancelled) setLiveCaptureQuality(quality);
    };

    sample();
    const timer = window.setInterval(sample, 450);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enforceCaptureQuality, cameraReady, instructionsOpen, facingMode]);

  useEffect(() => {
    if (
      !showFramingGuide ||
      guideFrame !== "a4" ||
      !cameraReady ||
      instructionsOpen
    ) {
      setLiveFraming(null);
      return;
    }

    let cancelled = false;
    const sample = () => {
      const guide = guideFrameRef.current;
      const viewfinder = viewfinderRef.current;
      if (!guide || !viewfinder) return;
      const framing = analyzeInvoiceCaptureFraming(
        guide.getBoundingClientRect().height,
        viewfinder.getBoundingClientRect().height,
      );
      if (!cancelled) setLiveFraming(framing);
    };

    sample();
    const timer = window.setInterval(sample, 350);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [showFramingGuide, guideFrame, cameraReady, instructionsOpen, facingMode]);

  useEffect(() => {
    if (!allowOpticalZoom || !cameraReady) {
      setOpticalZoom(null);
      return;
    }

    const track = streamRef.current?.getVideoTracks()[0];
    if (!track?.getCapabilities) {
      setOpticalZoom(null);
      return;
    }

    const caps = track.getCapabilities() as MediaTrackCapabilities & {
      zoom?: { min?: number; max?: number; step?: number };
    };
    const zoomCaps = caps.zoom;
    if (
      zoomCaps?.min == null ||
      zoomCaps.max == null ||
      zoomCaps.max <= zoomCaps.min
    ) {
      setOpticalZoom(null);
      return;
    }

    setOpticalZoom({
      min: zoomCaps.min,
      max: zoomCaps.max,
      step: zoomCaps.step ?? 0.1,
      value: zoomCaps.min,
    });
  }, [allowOpticalZoom, cameraReady, facingMode]);

  async function handleOpticalZoomChange(nextValue: number) {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    setOpticalZoom((current) =>
      current ? { ...current, value: nextValue } : current,
    );

    try {
      await track.applyConstraints({
        advanced: [{ zoom: nextValue } as MediaTrackConstraintSet],
      });
    } catch {
      // Non-critical — slider still gives a visual zoom hint on some devices.
    }
  }

  useEffect(
    () => () => {
      if (captureRejectTimerRef.current != null) {
        window.clearTimeout(captureRejectTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (continuousCapture) {
      setInstructionsOpen(false);
      return;
    }
    setInstructionsOpen(shouldShowBriefing);
  }, [shouldShowBriefing, continuousCapture]);

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
  }, [facingMode]);

  function flipCamera() {
    setFacingMode((current) =>
      current === "environment" ? "user" : "environment",
    );
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
      : buildA4ImageFromGuideCapture(fullCapture, crop, undefined, a4EncodeOptions);
  }

  async function processTableGuideCapture(
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
        "Tabellen-Rahmen zu klein — bitte näher heran oder Rahmen neu ausrichten.",
      );
    }

    return buildImageFromGuideCapture(
      fullCapture,
      crop,
      undefined,
      a4EncodeOptions,
    );
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

  async function validateCaptureCanvas(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!enforceCaptureQuality) return true;

    const quality = analyzeCaptureQuality(canvas);
    if (quality.isReady) return true;

    showCaptureRejectMessage(
      quality.issue
        ? captureQualityMessage(quality.issue)
        : captureQualityMessage("blur"),
    );
    return false;
  }

  async function handleCapture() {
    if (!videoRef.current || capturing || processingCapture || !cameraReady) {
      return;
    }

    const shouldGuideCrop =
      a4AutoCrop && (guideFrame === "a4" || guideFrame === "table");
    const guideLayout = shouldGuideCrop ? readA4CaptureLayout() : null;
    if (shouldGuideCrop && !guideLayout) {
      showCaptureRejectMessage(
        "Rahmen nicht bereit — bitte kurz warten und erneut auslösen.",
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

      if (!(await validateCaptureCanvas(canvas))) {
        canvas.width = 0;
        canvas.height = 0;
        return;
      }

      if (shouldGuideCrop && guideLayout) {
        setProcessingCapture(true);
        try {
          try {
            const croppedFile =
              guideFrame === "table"
                ? await processTableGuideCapture(canvas, guideLayout)
                : await processA4GuideCapture(canvas, guideLayout);
            await deliverCaptureFile(croppedFile);
          } catch {
            const file = await canvasToCaptureFile(
              canvas,
              undefined,
              captureEncodeOptions,
            );
            await deliverCaptureFile(file);
          }
        } finally {
          setProcessingCapture(false);
        }
      } else {
        setProcessingCapture(true);
        try {
          const file = await canvasToCaptureFile(canvas, undefined, captureEncodeOptions);
          await deliverCaptureFile(file);
        } finally {
          setProcessingCapture(false);
        }
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

    if (
      file.type.startsWith("image/") &&
      !file.type.includes("pdf") &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setProcessingCapture(true);
      try {
        const resized = await resizeDocumentImage(file);
        const blob = await fetch(resized.dataUrl).then((response) =>
          response.blob(),
        );
        await deliverCaptureFile(
          new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
      } catch (error) {
        setCameraError(
          error instanceof Error
            ? error.message
            : "Bild konnte nicht optimiert werden.",
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
  const chromeTopPad = compactChrome
    ? "max(2.4rem, calc(env(safe-area-inset-top) + 2rem))"
    : "max(3.25rem, calc(env(safe-area-inset-top) + 2.75rem))";
  const chromeBottomPad = compactChrome
    ? shutterHint
      ? "max(12.5rem, calc(env(safe-area-inset-bottom) + 11.5rem))"
      : "max(8.25rem, calc(env(safe-area-inset-bottom) + 7.25rem))"
    : resolvedHint || enforceCaptureQuality
      ? "max(8.5rem, calc(env(safe-area-inset-bottom) + 7rem))"
      : captureStep
        ? "max(6rem, calc(env(safe-area-inset-bottom) + 5rem))"
        : "max(4.75rem, calc(env(safe-area-inset-bottom) + 3.75rem))";

  const topBar = compactChrome ? null : (
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
        <p className="text-[0.8rem] font-semibold leading-snug text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
          {topBarLabel}
        </p>
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
      <div className="pointer-events-auto relative z-30 flex shrink-0 flex-col items-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
        {opticalZoom ? (
          <div className="mb-2 flex w-full max-w-xs items-center gap-2">
            <span className="w-8 shrink-0 text-right text-[0.68rem] font-medium text-white/80">
              {opticalZoom.value.toFixed(1)}×
            </span>
            <input
              type="range"
              min={opticalZoom.min}
              max={opticalZoom.max}
              step={opticalZoom.step}
              value={opticalZoom.value}
              onChange={(event) => {
                void handleOpticalZoomChange(Number(event.target.value));
              }}
              className="h-1.5 w-full accent-emerald-300"
              aria-label="Kamera-Zoom"
            />
          </div>
        ) : null}

        {captureRejectMessage ? (
          <div className="mb-3 w-full max-w-md rounded-xl bg-red-950/85 px-3 py-2.5 text-center shadow-lg backdrop-blur-md">
            <p className="text-[0.75rem] font-medium leading-snug text-red-100">
              {captureRejectMessage}
            </p>
          </div>
        ) : showBottomHintPanel ? (
          <div className="mb-3 w-full max-w-md rounded-xl bg-black/70 px-3 py-2.5 text-center shadow-lg backdrop-blur-md">
            {captureStep && !resolvedHint && !enforceCaptureQuality ? (
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white">
                Schritt {captureStep.current} von {captureStep.total}
              </p>
            ) : null}
            {resolvedHint ? (
              <p className="text-[0.75rem] font-medium leading-snug text-white">
                {resolvedHint}
              </p>
            ) : null}
            {showFramingGuide &&
            liveFraming &&
            liveFraming.status !== "good" &&
            liveFraming.status !== "unknown" ? (
              <p
                className={[
                  "text-[0.72rem] font-medium text-sky-200",
                  resolvedHint ? "mt-1" : "",
                ].join(" ")}
              >
                {liveFraming.message}
              </p>
            ) : null}
            {enforceCaptureQuality && liveCaptureQuality && !liveCaptureQuality.isReady ? (
              <p
                className={[
                  "text-[0.72rem] font-medium text-amber-200",
                  resolvedHint || showFramingGuide ? "mt-1" : "",
                ].join(" ")}
              >
                {liveCaptureQuality.issue === "dark"
                  ? "Zu dunkel — mehr Licht"
                  : "Unscharf — ruhig halten"}
              </p>
            ) : enforceCaptureQuality && frameReady ? (
              <p
                className={[
                  "text-[0.72rem] font-medium text-emerald-200",
                  resolvedHint || showFramingGuide ? "mt-1" : "",
                ].join(" ")}
              >
                Bereit — grüner Rahmen
              </p>
            ) : showFramingGuide && liveFraming?.status === "good" && frameReady ? (
              <p
                className={[
                  "text-[0.72rem] font-medium text-emerald-200",
                  resolvedHint ? "mt-1" : "",
                ].join(" ")}
              >
                {liveFraming.message}
              </p>
            ) : null}
          </div>
        ) : enforceCaptureQuality && captureRejectMessage === null && frameReady ? (
          <p className="mb-2 text-[0.68rem] font-medium text-emerald-200">
            Bereit — grüner Rahmen
          </p>
        ) : null}

        {compactChrome && shutterHint ? (
          <p className="mb-3 max-w-[min(100%,22rem)] rounded-xl bg-black/70 px-3 py-2 text-center text-[0.78rem] font-medium leading-snug text-white shadow-lg backdrop-blur-md">
            {shutterHint}
          </p>
        ) : null}

        <div className="flex w-full items-center justify-center gap-6">
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
          className={[
            "flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full border-4 shadow-[0_2px_18px_rgba(0,0,0,0.45)] transition-transform active:scale-90 disabled:opacity-40",
            frameReady && enforceCaptureQuality
              ? "border-emerald-300/95"
              : "border-white/95",
          ].join(" ")}
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
            {resolvedHint ? (
              <div className="rounded-2xl bg-white px-5 py-4 text-left shadow-lg">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Scan-Hinweis
                </p>
                <p className="mt-2 text-[0.9rem] font-medium leading-relaxed text-neutral-900">
                  {resolvedHint}
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

            {/* Document guide frame (optional) — visible during briefing once camera is up */}
            {guideFrame !== "none" && (cameraReady || instructionsOpen) ? (
              guideFrame === "table" ? (
                <GuideFrameViewport
                  chromeTopPad={chromeTopPad}
                  chromeBottomPad={chromeBottomPad}
                >
                  <div
                    ref={guideFrameRef}
                    className={[
                      GUIDE_FRAME_INNER_BASE_CLASS,
                      "rounded-md",
                      guideFrameBorderClass(guideFrameReady),
                      frameOutsideShadow,
                    ].join(" ")}
                    style={{ aspectRatio: TABLE_ASPECT_RATIO }}
                    aria-hidden
                  >
                    <GuideFrameCorners sharp />
                    {guideWatermark ? (
                      <GuideFrameWatermark>{guideWatermark}</GuideFrameWatermark>
                    ) : null}
                    {guideLabel ? (
                      <div className="absolute inset-x-2 bottom-2 flex justify-center">
                        <span className="rounded-lg bg-black/55 px-3 py-1 text-center text-[0.7rem] font-medium leading-snug text-white backdrop-blur-[2px]">
                          {guideLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </GuideFrameViewport>
              ) : guideFrame === "a4" ? (
                <GuideFrameViewport
                  chromeTopPad={chromeTopPad}
                  chromeBottomPad={chromeBottomPad}
                >
                  <div
                    ref={guideFrameRef}
                    className={[
                      GUIDE_FRAME_INNER_A4_CLASS,
                      "rounded-xl",
                      guideFrameBorderClass(guideFrameReady),
                      frameOutsideShadow,
                    ].join(" ")}
                    style={{ aspectRatio: A4_ASPECT_RATIO }}
                    aria-hidden
                  >
                    <GuideFrameCorners />
                    {!compactChrome ? (
                      <div className="absolute left-3 top-3 rounded-md bg-black/40 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/90">
                        DIN A4
                      </div>
                    ) : null}
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
                </GuideFrameViewport>
              ) : (
                <GuideFrameViewport
                  chromeTopPad={chromeTopPad}
                  chromeBottomPad={chromeBottomPad}
                  layoutClass={sectionFrameLayoutClass(guideSectionAnchor)}
                >
                  <div
                    ref={guideFrameRef}
                    className={[
                      GUIDE_FRAME_INNER_BASE_CLASS,
                      "rounded-md",
                      guideFrameBorderClass(guideFrameReady),
                      frameOutsideShadow,
                    ].join(" ")}
                    style={{
                      aspectRatio: SECTION_ASPECT_RATIOS[guideSectionAnchor],
                    }}
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
                </GuideFrameViewport>
              )
            ) : null}

            {processingCapture ? (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center backdrop-blur-[2px]">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                <p className="text-[0.9rem] font-semibold text-white">
                  Wird zugeschnitten…
                </p>
              </div>
            ) : null}

            {captureFlash ? (
              <div className="pointer-events-none absolute inset-0 z-30 bg-white/70 transition-opacity duration-150" />
            ) : null}

            {resolvedHint && instructionsOpen ? (
              <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/55 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24 backdrop-blur-[2px]">
                <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                  {captureStep ? (
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                      Schritt {captureStep.current} von {captureStep.total}
                    </p>
                  ) : (
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                      Scan-Hinweis
                    </p>
                  )}
                  <p className="mt-2 text-[1.05rem] font-semibold leading-snug text-neutral-900">
                    {title}
                  </p>
                  <p className="mt-3 text-[0.92rem] leading-relaxed text-neutral-700">
                    {resolvedHint}
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
