"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

import { LegalFooterNav } from "@/components/legal/legal-footer-nav";

interface PageTransitionProps {
  children: ReactNode;
}

function showGlobalLegalFooter(pathname: string): boolean {
  if (pathname === "/" || pathname.startsWith("/login")) return false;
  if (
    pathname === "/impressum" ||
    pathname === "/agb" ||
    pathname === "/datenschutz"
  ) {
    return false;
  }
  return true;
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
        {showGlobalLegalFooter(pathname) ? (
          <div className="relative z-30 pointer-events-auto">
            <LegalFooterNav
              className="mx-auto w-full max-w-lg px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
            />
          </div>
        ) : null}
      </div>
    </ViewTransition>
  );
}
