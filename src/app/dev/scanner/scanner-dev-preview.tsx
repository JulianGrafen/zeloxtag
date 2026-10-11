"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  INVOICE_CAPTURE_HINTS,
  InvoiceCaptureWizard,
} from "@/components/documents/invoice-capture-wizard";
import { InBrowserCamera } from "@/components/documents/in-browser-camera";

const MODES = [
  { id: "intro", label: "Intro" },
  { id: "overview", label: "A4" },
  { id: "positions", label: "Block" },
  { id: "loading", label: "Laden" },
  { id: "error", label: "Fehler" },
] as const;

export type ScannerDevMode = (typeof MODES)[number]["id"];

function isScannerDevMode(value: string | null): value is ScannerDevMode {
  return MODES.some((mode) => mode.id === value);
}

function DevModeBar({
  mode,
  onChange,
}: {
  mode: ScannerDevMode;
  onChange: (mode: ScannerDevMode) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[10000] border-t border-white/15 bg-neutral-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
      aria-label="Scanner-Vorschau Modi"
    >
      <p className="mb-1.5 text-center text-[0.62rem] font-medium uppercase tracking-[0.12em] text-white/45">
        Dev · Scanner UI
      </p>
      <div className="flex gap-1 overflow-x-auto">
        {MODES.map((item) => {
          const active = item.id === mode;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={[
                "shrink-0 rounded-full px-3 py-2 text-[0.72rem] font-semibold transition-colors",
                active
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/80",
              ].join(" ")}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function ScannerDevPreview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramMode = searchParams.get("mode");
  const initialMode = isScannerDevMode(paramMode) ? paramMode : "overview";

  const [mode, setMode] = useState<ScannerDevMode>(initialMode);

  const setModeAndUrl = useCallback(
    (next: ScannerDevMode) => {
      setMode(next);
      router.replace(`/dev/scanner?mode=${next}`, { scroll: false });
    },
    [router],
  );

  const noop = useCallback(() => {}, []);

  const overviewMock = useMemo(() => {
    if (mode === "loading") return "loading" as const;
    if (mode === "error") return "error" as const;
    return "viewfinder" as const;
  }, [mode]);

  if (mode === "intro") {
    return (
      <>
        <div className="mx-auto min-h-dvh max-w-lg bg-[color:var(--vd-bg)] pb-28">
          <InvoiceCaptureWizard
            title="Rechnung (Dev)"
            showImageUploadOnIntro
            allowPdf
            onFileSelected={noop}
          />
        </div>
        <DevModeBar mode={mode} onChange={setModeAndUrl} />
      </>
    );
  }

  if (mode === "positions") {
    return (
      <>
        <InBrowserCamera
          title="Rechnungsblock"
          hint={INVOICE_CAPTURE_HINTS.positions(1)}
          guideFrame="section"
          guideSectionAnchor="center"
          guideFrameDimOutside
          showBriefing={false}
          showHeaderGalleryPicker={false}
          enforceCaptureQuality
          allowOpticalZoom
          captureStep={{ current: 2, total: 2 }}
          uiPreviewMock="viewfinder"
          onCapture={noop}
          onClose={noop}
        />
        <DevModeBar mode={mode} onChange={setModeAndUrl} />
      </>
    );
  }

  return (
    <>
      <InBrowserCamera
        title="Gesamtseite"
        hint={INVOICE_CAPTURE_HINTS.overview}
        guideFrame="a4"
        guideFrameDimOutside
        a4AutoCrop
        showFramingGuide
        showBriefing={false}
        showHeaderGalleryPicker={false}
        enforceCaptureQuality
        allowOpticalZoom
        captureStep={{ current: 1, total: 1 }}
        uiPreviewMock={overviewMock}
        onCapture={noop}
        onClose={noop}
      />
      <DevModeBar mode={mode} onChange={setModeAndUrl} />
    </>
  );
}
