"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import { X } from "lucide-react";

export type GuidedTourStep = {
  id: string;
  target?: string;
  title: string;
  body: string;
  placement?: "auto" | "top" | "bottom";
};

export type GuidedTourProps = {
  steps: GuidedTourStep[];
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const PAD = 8;
const CARD_GAP = 14;

function readTargetRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  return {
    top: Math.max(8, rect.top - PAD),
    left: Math.max(8, rect.left - PAD),
    width: Math.min(rect.width + PAD * 2, window.innerWidth - 16),
    height: rect.height + PAD * 2,
  };
}

/**
 * Modern SaaS-style spotlight tour (no third-party dependency).
 */
export function GuidedTour({
  steps,
  open,
  onComplete,
  onSkip,
}: GuidedTourProps) {
  const [index, setIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [cardStyle, setCardStyle] = useState<CSSProperties>({});

  const step = steps[index];
  const isLast = index >= steps.length - 1;
  const isFirst = index === 0;

  const measure = useCallback(() => {
    if (!step) return;
    if (!step.target) {
      setSpotlight(null);
      setCardStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(22rem, calc(100vw - 2rem))",
      });
      return;
    }

    const rect = readTargetRect(step.target);
    if (!rect) {
      setSpotlight(null);
      setCardStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(22rem, calc(100vw - 2rem))",
      });
      return;
    }

    setSpotlight(rect);

    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const preferBottom =
      step.placement === "bottom" ||
      (step.placement !== "top" && spaceBelow > 220);

    const cardWidth = Math.min(352, window.innerWidth - 32);
    let left = rect.left + rect.width / 2 - cardWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - cardWidth - 16));

    if (preferBottom) {
      setCardStyle({
        top: Math.min(rect.top + rect.height + CARD_GAP, window.innerHeight - 240),
        left,
        width: cardWidth,
        bottom: "auto",
        transform: "none",
      });
    } else {
      const bottom = Math.max(
        16,
        window.innerHeight - rect.top + CARD_GAP,
      );
      setCardStyle({
        bottom,
        left,
        width: cardWidth,
        top: "auto",
        transform: "none",
      });
    }
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return;

    if (step.target) {
      const el = document.querySelector(step.target);
      if (el instanceof HTMLElement) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches;
        el.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "center",
        });
      }
    }

    const timers = [
      window.setTimeout(measure, 60),
      window.setTimeout(measure, 280),
      window.setTimeout(measure, 500),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [open, step, measure, index]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onSkip();
      if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        if (isLast) onComplete();
        else setIndex((value) => Math.min(value + 1, steps.length - 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isLast, onComplete, onSkip, steps.length]);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  if (!open || !step || steps.length === 0) return null;

  const progress = `${index + 1} / ${steps.length}`;

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-tour-title"
    >
      {spotlight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-[1.25rem] transition-all duration-300 ease-out"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(15, 17, 21, 0.74)",
            outline: "2px solid rgba(255,255,255,0.92)",
            outlineOffset: 2,
          }}
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[rgba(15,17,21,0.74)]"
        />
      )}

      {/* Capture clicks so tiles stay inert during the tour; only UI buttons dismiss. */}
      <div aria-hidden className="absolute inset-0 z-0" />

      <div
        className="absolute z-10 rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:p-5"
        style={cardStyle}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--vd-muted)]">
            Onboarding · {progress}
          </p>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Tour schließen"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--vd-muted)] hover:bg-[color:var(--vd-surface-elevated)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div
          className="mb-3 h-1 overflow-hidden rounded-full bg-[color:var(--vd-surface-elevated)]"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-neutral-900 transition-all duration-300"
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>

        <h2
          id="guided-tour-title"
          className="font-[family-name:var(--font-display)] text-[1.15rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]"
        >
          {step.title}
        </h2>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
          {step.body}
        </p>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl px-3 py-2.5 text-[0.8rem] font-medium text-[color:var(--vd-muted)]"
          >
            Überspringen
          </button>
          <div className="ml-auto flex gap-2">
            {!isFirst ? (
              <button
                type="button"
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
                className="rounded-xl border border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)] px-3.5 py-2.5 text-[0.8rem] font-semibold text-[color:var(--vd-text)]"
              >
                Zurück
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (isLast) onComplete();
                else setIndex((value) => value + 1);
              }}
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-[0.8rem] font-semibold text-white"
            >
              {isLast ? "Fertig" : "Weiter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
