"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ViewTransition } from "react";

import { LegalFooterNav } from "@/components/legal/legal-footer-nav";
import { shouldRenderGlobalLegalFooter } from "@/lib/legal/show-global-legal-footer";
import { usePublicShowcaseSurface } from "@/lib/legal/use-public-showcase-surface";
import {
  isScanSurfaceActive,
  subscribeScanSurface,
} from "@/lib/ui/scan-surface-state";

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
  const searchParams = useSearchParams();
  const publicShowcase = usePublicShowcaseSurface();
  const [scanSurfaceActive, setScanSurfaceActive] = useState(
    () => isScanSurfaceActive(),
  );

  useEffect(() => {
    return subscribeScanSurface(() => {
      setScanSurfaceActive(isScanSurfaceActive());
    });
  }, []);

  const showLegalFooter = shouldRenderGlobalLegalFooter({
    pathname,
    publicShowcase,
    scanQueryActive: searchParams.get("scan") === "1",
    scanSurfaceActive,
  });

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
        {showLegalFooter ? (
          <div className="relative isolate z-[100]">
            <LegalFooterNav
              className="mx-auto w-full max-w-lg px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4"
            />
          </div>
        ) : null}
      </div>
    </ViewTransition>
  );
}
