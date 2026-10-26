"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useNativeBottomChromeOffsetClass } from "@/lib/navigation/use-native-bottom-chrome-offset";
import { cn } from "@/lib/utils";

/** Above legal footer (z-100) and cookie banner (z-120). */
export const FIXED_BOTTOM_ACTION_Z = "z-[125]";

/** Scan FAB + quick-action sheet — same layer as bottom bars. */
export const SCAN_FAB_Z = "z-[125]";

function subscribeClientNoop() {
  return () => undefined;
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export type FixedBottomActionBarVariant = "default" | "ios";

const BAR_SURFACE_CLASS: Record<FixedBottomActionBarVariant, string> = {
  default:
    "border-t border-[color:var(--vd-border)] bg-[color:var(--vd-bg)] shadow-[0_-10px_28px_rgba(0,0,0,0.08)]",
  ios: "border-t border-white/10 bg-black/80 backdrop-blur-xl",
};

type FixedBottomActionBarProps = {
  children: ReactNode;
  variant?: FixedBottomActionBarVariant;
  className?: string;
  innerClassName?: string;
  /**
   * Portal to `document.body` so stacking is not capped by page shells (e.g. submit bars).
   */
  portal?: boolean;
};

export function FixedBottomActionBar({
  children,
  variant = "default",
  className,
  innerClassName,
  portal = variant === "ios",
}: FixedBottomActionBarProps) {
  const isClient = useSyncExternalStore(
    subscribeClientNoop,
    getClientSnapshot,
    getServerSnapshot,
  );
  const bottomOffsetClass = useNativeBottomChromeOffsetClass();

  const bar = (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0",
        bottomOffsetClass,
        FIXED_BOTTOM_ACTION_Z,
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto relative px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5",
          BAR_SURFACE_CLASS[variant],
          innerClassName,
        )}
      >
        <div className="mx-auto w-full max-w-lg">{children}</div>
      </div>
    </div>
  );

  if (portal) {
    if (!isClient) return null;
    return createPortal(
      <div className="dark" data-zt-fixed-chrome-root="">
        {bar}
      </div>,
      document.body,
    );
  }

  return bar;
}
