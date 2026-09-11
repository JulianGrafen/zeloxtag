"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import { useShowroomMotion } from "./showroom-motion";
import { showroom } from "./showroom-styles";

type ShowroomDisclosureProps = {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle?: () => void;
  panelId: string;
  children: ReactNode;
  /** When false, header is static and content is always visible. */
  collapsible?: boolean;
};

export function ShowroomDisclosure({
  title,
  subtitle,
  open,
  onToggle,
  panelId,
  children,
  collapsible = true,
}: ShowroomDisclosureProps) {
  const motionConfig = useShowroomMotion();
  const showPanel = !collapsible || open;

  const headerContent = (
    <span className="min-w-0 flex-1 text-left">
      <span
        className={cn(
          "block truncate",
          subtitle
            ? showroom.rowLabel
            : "text-[0.94rem] font-medium text-white",
        )}
      >
        {title}
      </span>
      {subtitle ? (
        <span className="mt-0.5 block truncate text-[0.82rem] text-white/50">
          {subtitle}
        </span>
      ) : null}
    </span>
  );

  const chevron = (
    <motion.span
      animate={{ rotate: open ? 180 : 0 }}
      transition={motionConfig.transitionSnappy}
      className="inline-flex shrink-0"
      aria-hidden
    >
      <ChevronDown className="h-4 w-4 text-white/40" />
    </motion.span>
  );

  return (
    <div>
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            showroom.disclosureRow,
            showPanel && "border-b border-white/10",
          )}
          aria-expanded={open}
          aria-controls={panelId}
        >
          {headerContent}
          {chevron}
        </button>
      ) : (
        <div
          className={cn(
            showroom.disclosureRow,
            showPanel && "border-b border-white/10",
          )}
        >
          {headerContent}
        </div>
      )}

      <AnimatePresence initial={false}>
        {showPanel ? (
          <motion.div
            id={panelId}
            className="min-w-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              motionConfig.reduceMotion
                ? { duration: 0 }
                : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
            }
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
