"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Apple-/iOS-ähnlicher Seitenwechsel:
 * - Vorwärts: neue Seite von rechts
 * - Zurück: neue Seite von links
 * Nutzt React View Transitions (Next experimental.viewTransition).
 *
 * Important: do NOT remount this boundary with key={pathname} — that can
 * leave a stuck ::view-transition layer that blocks all taps.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      default="none"
      update="none"
    >
      <div className="vd-page" data-vd-page data-pathname={pathname}>
        {children}
      </div>
    </ViewTransition>
  );
}
