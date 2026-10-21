"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type DemoViewId = "garage" | "showcase";

type DemoViewSwitchProps = {
  activeView: DemoViewId;
  onChange: (view: DemoViewId) => void;
  className?: string;
};

const VIEWS: { id: DemoViewId; label: string }[] = [
  { id: "garage", label: "Garage" },
  { id: "showcase", label: "Showcase-Karte" },
];

const SWITCH_EASE = [0.32, 0.72, 0, 1] as const;

export function DemoViewSwitch({
  activeView,
  onChange,
  className,
}: DemoViewSwitchProps) {
  const reduceMotion = useReducedMotion();
  const activeIndex = activeView === "garage" ? 0 : 1;

  return (
    <div
      role="tablist"
      aria-label="Demo-Ansicht"
      className={cn(
        "relative grid w-full grid-cols-2 rounded-xl border border-neutral-800 bg-neutral-900/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm",
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
            : { duration: 0.28, ease: SWITCH_EASE }
        }
      />

      {VIEWS.map((view) => {
        const selected = activeView === view.id;
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(view.id)}
            className={cn(
              "relative z-10 rounded-lg px-3 py-2 text-xs transition-colors duration-200",
              selected
                ? "font-medium text-white"
                : "text-neutral-400 hover:text-white",
            )}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
