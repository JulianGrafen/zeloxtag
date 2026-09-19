"use client";

import type { ReactNode } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";

export const SCAN_PROCESSING_HEADING = "Verarbeiten";
export const SCAN_UPLOAD_HEADING = "Hochladen";

/** @deprecated Use SCAN_PROCESSING_HEADING */
export const SCAN_PROCESSING_TITLE = SCAN_PROCESSING_HEADING;

export type ScanStatusHeading =
  | typeof SCAN_PROCESSING_HEADING
  | typeof SCAN_UPLOAD_HEADING;

export function ScanProcessingPanel({
  heading = SCAN_PROCESSING_HEADING,
  detail,
  hint,
  state = "working",
  theme = "auto",
  footer,
  className = "",
  compact = false,
  surface = "default",
}: {
  /** Uppercase status line above the detail (Verarbeiten vs Hochladen). */
  heading?: ScanStatusHeading;
  /** Context line under the title (e.g. document type being extracted). */
  detail: string;
  hint?: string;
  state?: OrbState;
  theme?: "auto" | "dark" | "light";
  footer?: ReactNode;
  className?: string;
  /** Smaller vertical padding for inline wizard cards. */
  compact?: boolean;
  /** Light text on dark fullscreen overlays. */
  surface?: "default" | "inverse";
}) {
  const titleClass =
    surface === "inverse"
      ? "text-white/60"
      : "text-[color:var(--vd-muted)]";
  const detailClass =
    surface === "inverse"
      ? "text-white"
      : "text-[color:var(--vd-text)]";
  const hintClass =
    surface === "inverse"
      ? "text-white/75"
      : "text-[color:var(--vd-muted)]";

  return (
    <div
      className={[
        compact
          ? "flex flex-col items-center gap-4 py-6 text-center"
          : "flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center",
        className,
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-label={`${heading}: ${detail}`}
    >
      <ThinkingOrb
        state={state}
        size={64}
        theme={theme}
        aria-label={heading}
      />
      <div className="max-w-sm space-y-1">
        <p
          className={`text-[0.78rem] font-medium tracking-[0.14em] uppercase ${titleClass}`}
        >
          {heading}
        </p>
        <p className={`text-[0.95rem] font-semibold ${detailClass}`}>
          {detail}
        </p>
        {hint ? (
          <p className={`text-[0.8rem] leading-relaxed ${hintClass}`}>
            {hint}
          </p>
        ) : null}
      </div>
      {footer}
      <span className="sr-only">
        {heading}: {detail}
      </span>
    </div>
  );
}

export function ScanProcessingStepChips({ steps }: { steps: string[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {steps.map((step) => (
        <span
          key={step}
          className="rounded-full bg-neutral-100 px-2.5 py-1 text-[0.68rem] font-medium text-neutral-600"
        >
          {step}
        </span>
      ))}
    </div>
  );
}
