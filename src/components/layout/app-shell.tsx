import type { ReactNode } from "react";

import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { Navbar } from "./navbar";

interface AppShellProps {
  children: ReactNode;
  /** Hide navbar on immersive scan/claim surfaces when needed. */
  showNavbar?: boolean;
}

export function AppShell({ children, showNavbar = true }: AppShellProps) {
  return (
    <div className="vd-root relative min-h-dvh w-full max-w-full overflow-x-clip">
      <div
        aria-hidden
        className="vd-atmosphere pointer-events-none absolute inset-0 z-0"
      />
      <div className="relative z-10 flex min-h-dvh flex-col">
        {showNavbar ? <Navbar /> : null}
        <main className="flex min-w-0 flex-1 overflow-x-clip" data-surface="automotive">
          {children}
        </main>
        <CookieConsentBanner />
      </div>
    </div>
  );
}
