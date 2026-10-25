import type { ReactNode } from "react";

import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { AdaptiveNavShell } from "@/components/layout/adaptive-nav-shell";

interface AppShellProps {
  children: ReactNode;
  /** Hide navbar on immersive scan/claim surfaces when needed. */
  showNavbar?: boolean;
  /** Immersive web layout while retaining native bottom tabs. */
  immersiveNativeNav?: boolean;
}

export function AppShell({
  children,
  showNavbar = true,
  immersiveNativeNav = false,
}: AppShellProps) {
  return (
    <div className="vd-root relative min-h-dvh w-full max-w-full overflow-x-clip">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <AdaptiveNavShell
          showNavbar={showNavbar}
          immersiveNativeNav={immersiveNativeNav}
        >
          <main
            className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-clip"
            data-surface="automotive"
          >
            {children}
          </main>
        </AdaptiveNavShell>
        <CookieConsentBanner />
      </div>
    </div>
  );
}
