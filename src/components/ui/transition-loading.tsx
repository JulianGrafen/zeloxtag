"use client";

import { ThinkingOrb, type OrbState } from "thinking-orbs";

import { RouteTransitionLoadingMarker } from "@/components/ui/route-transition-loading-marker";

export type TransitionLoadingProps = {
  /** Screen reader + visible status line */
  label?: string;
  state?: OrbState;
  /** Pin palette when the host surface is fixed (e.g. exposé paper). */
  theme?: "auto" | "dark" | "light";
  className?: string;
};

/**
 * Centered thinking-orb for route transitions and short waits.
 */
export function TransitionLoading({
  label = "Lädt…",
  state = "connecting",
  theme = "auto",
  className = "",
}: TransitionLoadingProps) {
  return (
    <div
      className={`mx-auto flex w-full max-w-lg min-h-dvh flex-col items-center justify-center gap-4 px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-5 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <ThinkingOrb
        state={state}
        size={64}
        theme={theme}
        aria-label={label}
      />
      <p className="text-center text-[0.78rem] font-medium tracking-[0.14em] text-[color:var(--vd-muted)] uppercase">
        {label}
      </p>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Activates route-level loading (orb overlay in PageTransition). No full-screen fallback UI. */
export function RouteTransitionLoadingTrigger({
  label = "Lädt",
}: {
  label?: string;
}) {
  return (
    <RouteTransitionLoadingMarker>
      <span className="sr-only">{label}</span>
    </RouteTransitionLoadingMarker>
  );
}

/** Centered orb while a route segment is loading (see PageTransition). */
export function RouteTransitionLoadingOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
      aria-hidden
    >
      <ThinkingOrb
        state="connecting"
        size={64}
        theme="auto"
        aria-label="Lädt"
      />
    </div>
  );
}

/** @deprecated Use AppShell + RouteTransitionLoadingTrigger in loading.tsx */
export function DashboardTransitionLoading() {
  return <RouteTransitionLoadingTrigger label="Dashboard wird geladen" />;
}

/** @deprecated Use AppShell + RouteTransitionLoadingTrigger in loading.tsx */
export function DocumentsTransitionLoading() {
  return (
    <RouteTransitionLoadingTrigger label="Dokumente werden geladen" />
  );
}

/** Inline orb for buttons / panels (20px preset). */
export function InlineThinkingOrb({
  state = "working",
  label = "Lädt",
}: {
  state?: OrbState;
  label?: string;
}) {
  return (
    <ThinkingOrb
      state={state}
      size={20}
      theme="auto"
      aria-label={label}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    />
  );
}
