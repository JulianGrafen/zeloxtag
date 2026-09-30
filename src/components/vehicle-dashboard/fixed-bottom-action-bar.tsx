"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/** Above global legal footer (z-100); below cookie banner (z-120). */
export const FIXED_BOTTOM_ACTION_Z = "z-[110]";

type FixedBottomActionBarProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  /**
   * Portal to `document.body` so stacking is not capped by page shells (e.g. submit bars).
   */
  portal?: boolean;
};

export function FixedBottomActionBar({
  children,
  className,
  innerClassName,
  portal = false,
}: FixedBottomActionBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bar = (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0",
        FIXED_BOTTOM_ACTION_Z,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto relative border-t border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(0,0,0,0.08)] sm:px-5",
          innerClassName,
        )}
      >
        <div className="mx-auto w-full max-w-lg">{children}</div>
      </div>
    </div>
  );

  if (portal) {
    if (!mounted) return null;
    return createPortal(bar, document.body);
  }

  return bar;
}
