"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { usePressFeedback } from "./usePressFeedback";

type PressVariant = "tile" | "row" | "button" | "pill";

interface PressableLinkProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: PressVariant;
  className?: string;
  children: ReactNode;
  /** Überschreibt die automatische Nav-Richtung (tile/row → forward, pill → back) */
  nav?: "forward" | "back" | "none";
}

interface PressableButtonProps
  extends Omit<ComponentProps<"button">, "className"> {
  variant?: PressVariant;
  className?: string;
  children: ReactNode;
}

function pressClass(variant: PressVariant, className = "") {
  return ["vd-pressable", `vd-pressable--${variant}`, className]
    .filter(Boolean)
    .join(" ");
}

function defaultNav(
  variant: PressVariant,
  nav?: PressableLinkProps["nav"],
): "forward" | "back" | "none" {
  if (nav) return nav;
  if (variant === "pill") return "back";
  if (variant === "tile" || variant === "row") return "forward";
  return "none";
}

function isViewTransitionActive(): boolean {
  if (typeof document === "undefined") return false;
  try {
    // CSS :active-view-transition — when true, another VT is in flight.
    return document.documentElement.matches(":active-view-transition");
  } catch {
    return false;
  }
}

export function PressableLink({
  variant = "row",
  className,
  children,
  nav,
  transitionTypes,
  onClick,
  ...props
}: PressableLinkProps) {
  const { pressProps } = usePressFeedback();
  const direction = defaultNav(variant, nav);

  return (
    <Link
      {...props}
      {...pressProps}
      transitionTypes={
        // Avoid queuing overlapping view transitions (common cause of
        // "dead" taps until reload).
        isViewTransitionActive()
          ? undefined
          : (transitionTypes ??
            (direction === "none"
              ? undefined
              : direction === "back"
                ? ["nav-back"]
                : ["nav-forward"]))
      }
      onClick={(event) => {
        onClick?.(event);
      }}
      className={pressClass(variant, className)}
      style={{ WebkitTapHighlightColor: "transparent", ...props.style }}
    >
      {children}
    </Link>
  );
}

export function PressableButton({
  variant = "button",
  className,
  children,
  type = "button",
  onClick,
  ...props
}: PressableButtonProps) {
  const { pressProps } = usePressFeedback();

  return (
    <button
      type={type}
      {...props}
      {...pressProps}
      onClick={(event) => {
        onClick?.(event);
      }}
      className={pressClass(variant, className)}
      style={{ WebkitTapHighlightColor: "transparent", ...props.style }}
    >
      {children}
    </button>
  );
}
