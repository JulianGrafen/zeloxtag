"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type DashboardTabId = "overview" | "timeline";

type DashboardTabSwitchProps = {
  activeTab: DashboardTabId;
  onChange: (tab: DashboardTabId) => void;
  className?: string;
};

const TABS: { id: DashboardTabId; label: string }[] = [
  { id: "overview", label: "Übersicht" },
  { id: "timeline", label: "Chronik" },
];

const TAB_SWITCH_EASE = [0.32, 0.72, 0, 1] as const;

export function DashboardTabSwitch({
  activeTab,
  onChange,
  className,
}: DashboardTabSwitchProps) {
  const reduceMotion = useReducedMotion();
  const activeIndex = activeTab === "overview" ? 0 : 1;

  return (
    <div
      role="tablist"
      aria-label="Dashboard-Ansicht"
      data-tour="dashboard-chronik-tabs"
      className={cn(
        "relative mb-4 grid w-full grid-cols-2 rounded-xl border border-neutral-800 bg-neutral-900 p-1",
        className,
      )}
    >
      <motion.div
        aria-hidden
        className="absolute bottom-1 top-1 rounded-lg bg-neutral-800 shadow-sm"
        style={{ width: "calc(50% - 0.25rem)" }}
        initial={false}
        animate={{
          left: activeIndex === 0 ? "0.25rem" : "50%",
        }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.28, ease: TAB_SWITCH_EASE }
        }
      />

      {TABS.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`dashboard-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`dashboard-panel-${tab.id}`}
            data-tour={
              tab.id === "timeline" ? "dashboard-chronik-tab" : undefined
            }
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 rounded-lg px-4 py-1.5 text-xs transition-colors duration-200",
              selected
                ? "font-medium text-white"
                : "text-neutral-400 hover:text-white",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
