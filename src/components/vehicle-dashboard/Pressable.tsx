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

export function PressableLink({
  variant = "row",
  className,
  children,
  nav,
  transitionTypes,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onBlur,
  ...props
}: PressableLinkProps) {
  const { pressProps } = usePressFeedback();
  const direction = defaultNav(variant, nav);
  const types =
    transitionTypes ??
    (direction === "none"
      ? undefined
      : direction === "back"
        ? ["nav-back"]
        : ["nav-forward"]);

  return (
    <Link
      {...props}
      transitionTypes={types}
      onPointerDown={(event) => {
        pressProps.onPointerDown(event);
        onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        pressProps.onPointerUp(event);
        onPointerUp?.(event);
      }}
      onPointerCancel={(event) => {
        pressProps.onPointerCancel(event);
        onPointerCancel?.(event);
      }}
      onLostPointerCapture={pressProps.onLostPointerCapture}
      onBlur={(event) => {
        pressProps.onBlur();
        onBlur?.(event);
      }}
      data-pressed={pressProps["data-pressed"]}
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
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onBlur,
  ...props
}: PressableButtonProps) {
  const { pressProps } = usePressFeedback();

  return (
    <button
      type={type}
      {...props}
      onPointerDown={(event) => {
        pressProps.onPointerDown(event);
        onPointerDown?.(event);
      }}
      onPointerUp={(event) => {
        pressProps.onPointerUp(event);
        onPointerUp?.(event);
      }}
      onPointerCancel={(event) => {
        pressProps.onPointerCancel(event);
        onPointerCancel?.(event);
      }}
      onLostPointerCapture={pressProps.onLostPointerCapture}
      onBlur={(event) => {
        pressProps.onBlur();
        onBlur?.(event);
      }}
      data-pressed={pressProps["data-pressed"]}
      className={pressClass(variant, className)}
      style={{ WebkitTapHighlightColor: "transparent", ...props.style }}
    >
      {children}
    </button>
  );
}
