"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { consumeTagScanRitualForSession } from "@/lib/tags/tag-scan-ritual";
import { cn } from "@/lib/utils";

import { TagScanRitualOverlay } from "./tag-scan-ritual-overlay";

type TagScanRitualGateProps = {
  tagUuid: string;
  /** When false, children render immediately (deep links, claim, etc.). */
  enabled?: boolean;
  children: ReactNode;
};

/**
 * Hardware → software handoff: brief verification beat before tag landing UI.
 */
export function TagScanRitualGate({
  tagUuid,
  enabled = true,
  children,
}: TagScanRitualGateProps) {
  const reduceMotion = useReducedMotion();
  const [ritualActive, setRitualActive] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (!enabled || reduceMotion) {
      setContentVisible(true);
      return;
    }
    const shouldPlay = consumeTagScanRitualForSession(tagUuid);
    if (!shouldPlay) {
      setContentVisible(true);
      return;
    }
    setRitualActive(true);
  }, [enabled, reduceMotion, tagUuid]);

  const handleComplete = useCallback(() => {
    setRitualActive(false);
    setContentVisible(true);
  }, []);

  return (
    <>
      <div
        className={cn(
          "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          contentVisible
            ? "opacity-100 translate-y-0"
            : "pointer-events-none opacity-0 translate-y-1 scale-[0.992]",
        )}
        aria-hidden={ritualActive ? true : undefined}
      >
        {children}
      </div>
      <AnimatePresence>
        {ritualActive ? (
          <TagScanRitualOverlay
            key="tag-scan-ritual"
            tagUuid={tagUuid}
            onComplete={handleComplete}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
