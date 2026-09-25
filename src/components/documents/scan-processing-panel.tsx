"use client";

import type { ReactNode } from "react";
import { ThinkingOrb, type OrbSize, type OrbState } from "thinking-orbs";

export const SCAN_PROCESSING_HEADING = "Verarbeiten";
export const SCAN_UPLOAD_HEADING = "Hochladen";

/** @deprecated Use SCAN_PROCESSING_HEADING */
export const SCAN_PROCESSING_TITLE = SCAN_PROCESSING_HEADING;

export type ScanStatusHeading =
  | typeof SCAN_PROCESSING_HEADING
  | typeof SCAN_UPLOAD_HEADING;

export function ScanProgressBar({
  percent,
  className = "",
}: {
  percent: number;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={[
        "h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--vd-surface-elevated)]",
        className,
      ].join(" ")}
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[color:var(--vd-text)] transition-[width] duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

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
  orbSize = 64,
  showProgress = false,
  progressPercent = 0,
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
  orbSize?: OrbSize;
  showProgress?: boolean;
  progressPercent?: number;
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

  const orbHaloClass =
    surface === "inverse"
      ? "rounded-full border border-white/15 bg-white/5 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      : "rounded-full border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] p-3 shadow-[var(--vd-shadow-sm)]";

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
      <div className={orbHaloClass}>
        <ThinkingOrb
          state={state}
          size={orbSize}
          theme={theme}
          aria-label={heading}
        />
      </div>
      <div className="w-full max-w-sm space-y-2">
        <div className="space-y-1">
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
        {showProgress ? (
          <ScanProgressBar percent={progressPercent} />
        ) : null}
      </div>
      {footer}
      <span className="sr-only">
        {heading}: {detail}
      </span>
    </div>
  );
}

export function ScanProcessingStepChips({
  steps,
  activeIndex = -1,
}: {
  steps: string[];
  activeIndex?: number;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {steps.map((step, index) => {
        const active = index === activeIndex;
        const done = activeIndex > index;
        return (
          <span
            key={step}
            className={[
              "rounded-full px-2.5 py-1 text-[0.68rem] font-medium transition-colors",
              active
                ? "bg-[color:var(--vd-text)] text-[color:var(--vd-surface)]"
                : done
                  ? "border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] text-[color:var(--vd-text)]"
                  : "bg-[color:var(--vd-surface-elevated)] text-[color:var(--vd-muted)]",
            ].join(" ")}
          >
            {step}
          </span>
        );
      })}
    </div>
  );
}
