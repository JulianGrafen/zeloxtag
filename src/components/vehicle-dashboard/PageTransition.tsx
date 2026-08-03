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
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <ViewTransition
      key={pathname}
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "nav-forward",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "nav-forward",
      }}
      default="none"
    >
      <div className="vd-page" data-vd-page data-pathname={pathname}>
        {children}
      </div>
    </ViewTransition>
  );
}
