"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { PressableButton, PressableLink } from "@/components/vehicle-dashboard/Pressable";
import { cn } from "@/lib/utils";

const SHEET_EASE = [0.22, 1, 0.36, 1] as const;

export type DashboardQuickAction = {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

type DashboardQuickActionSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: DashboardQuickAction[];
};

export function DashboardQuickActionSheet({
  open,
  onClose,
  title = "Schnellaktion",
  actions,
}: DashboardQuickActionSheetProps) {
  const reduceMotion = useReducedMotion();

  const sheetMotion = reduceMotion
    ? { initial: false as const, animate: { y: 0 }, exit: { y: 0 } }
    : {
        initial: { y: "100%" },
        animate: { y: 0 },
        exit: { y: "100%" },
        transition: { duration: 0.34, ease: SHEET_EASE },
      };

  const visibleActions = actions.filter((action) => action.href || action.onClick);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-auto fixed inset-0 z-[108] flex items-end justify-center bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Schließen"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
          />

          <motion.div
            {...sheetMotion}
            className={cn(
              "relative z-10 flex w-full max-w-lg min-h-0 flex-col overflow-hidden",
              "rounded-t-[1.5rem] border border-b-0 border-white/10",
              "bg-gradient-to-b from-zinc-900 to-zinc-950 text-zinc-100",
              "shadow-[0_-20px_50px_rgba(0,0,0,0.55)]",
              "max-h-[min(48dvh,calc(48vh-env(safe-area-inset-bottom)))]",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15"
              aria-hidden
            />

            <div className="px-5 pt-4 pb-2">
              <h2
                className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-tight text-white"
              >
                {title}
              </h2>
            </div>

            <ul className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {visibleActions.map((action) => {
                const Icon = action.icon;
                const rowClassName =
                  "flex min-h-[3.25rem] w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition hover:bg-white/5";

                const content = (
                  <>
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800/90 text-zinc-100 ring-1 ring-inset ring-white/10"
                      aria-hidden
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.92rem] font-semibold text-zinc-100">
                        {action.label}
                      </span>
                      {action.description ? (
                        <span className="mt-0.5 block text-[0.75rem] text-zinc-500">
                          {action.description}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-zinc-600"
                      aria-hidden
                    />
                  </>
                );

                return (
                  <li key={action.id} className="py-0.5">
                    {action.href && !action.disabled ? (
                      <PressableLink
                        href={action.href}
                        variant="row"
                        className={rowClassName}
                        onClick={onClose}
                      >
                        {content}
                      </PressableLink>
                    ) : (
                      <PressableButton
                        type="button"
                        variant="row"
                        disabled={action.disabled}
                        className={cn(rowClassName, action.disabled && "opacity-45")}
                        onClick={() => {
                          if (action.disabled) return;
                          action.onClick?.();
                          onClose();
                        }}
                      >
                        {content}
                      </PressableButton>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
