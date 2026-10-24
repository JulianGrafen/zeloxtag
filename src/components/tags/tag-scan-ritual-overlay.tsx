"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo } from "react";

import {
  buildTagScanRitualTicker,
  TAG_SCAN_RITUAL_DURATION_MS,
} from "@/lib/tags/tag-scan-ritual";
import { formatTagDisplayId } from "@/lib/tags/format-tag-display-id";
import { cn } from "@/lib/utils";

type TagScanRitualOverlayProps = {
  tagUuid: string;
  onComplete: () => void;
  className?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function TagScanRitualOverlay({
  tagUuid,
  onComplete,
  className,
}: TagScanRitualOverlayProps) {
  const reduceMotion = useReducedMotion();
  const displayId = useMemo(() => formatTagDisplayId(tagUuid), [tagUuid]);
  const ticker = useMemo(
    () => buildTagScanRitualTicker(displayId),
    [displayId],
  );

  useEffect(() => {
    if (reduceMotion) {
      onComplete();
      return;
    }
    const timer = window.setTimeout(onComplete, TAG_SCAN_RITUAL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete, reduceMotion]);

  if (reduceMotion) {
    return null;
  }

  return (
    <motion.div
      className={cn(
        "tag-scan-ritual fixed inset-0 z-[220] flex flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="ZeloxTag wird verifiziert"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.28, ease: EASE } }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_38%,rgba(255,255,255,0.06),transparent_62%)]"
        aria-hidden
      />

      <div className="relative flex w-full max-w-[17rem] flex-col items-center gap-8">
        <div className="tag-scan-ritual__reticle relative h-[7.5rem] w-[7.5rem]">
          <span className="tag-scan-ritual__corner tag-scan-ritual__corner--tl" />
          <span className="tag-scan-ritual__corner tag-scan-ritual__corner--tr" />
          <span className="tag-scan-ritual__corner tag-scan-ritual__corner--bl" />
          <span className="tag-scan-ritual__corner tag-scan-ritual__corner--br" />
          <motion.div
            className="absolute inset-[18%] rounded-sm border border-white/[0.06]"
            initial={{ opacity: 0, scale: 1.14 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.42, ease: EASE }}
            aria-hidden
          />
        </div>

        <div className="relative w-full overflow-hidden">
          <div className="tag-scan-ritual__scanline" aria-hidden />
          <p className="tag-scan-ritual__ticker font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-zinc-500">
            <span className="tag-scan-ritual__ticker-inner">{ticker}</span>
            <span className="tag-scan-ritual__ticker-inner" aria-hidden>
              {ticker}
            </span>
          </p>
        </div>

        <motion.div
          className="tag-scan-ritual__seal relative flex h-14 w-14 items-center justify-center rounded-full"
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.62,
            duration: 0.38,
            type: "spring",
            stiffness: 420,
            damping: 22,
          }}
        >
          <span
            className="absolute inset-0 rounded-full border border-white/20 bg-gradient-to-b from-zinc-800/90 to-zinc-950/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.45)]"
            aria-hidden
          />
          <Check
            className="relative z-[1] h-6 w-6 text-emerald-400/95"
            strokeWidth={2.25}
            aria-hidden
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
