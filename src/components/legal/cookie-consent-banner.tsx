"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  acceptCookieConsent,
  hasCookieConsent,
} from "@/lib/legal/cookie-consent-client";

const TITLE_ID = "zt-cookie-consent-title";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasCookieConsent());
  }, []);

  function handleAccept() {
    acceptCookieConsent();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby={TITLE_ID}
      aria-modal="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
    >
      <div
        className="pointer-events-auto vd-surface-card flex w-full max-w-lg flex-col gap-4 border border-[color:var(--vd-border)] p-4 shadow-lg sm:flex-row sm:items-end sm:gap-5"
      >
        <div className="min-w-0 flex-1 space-y-2 text-[0.88rem] leading-relaxed text-[color:var(--vd-text)]">
          <p id={TITLE_ID} className="text-[0.95rem] font-semibold">
            Cookies &amp; Datenschutz
          </p>
          <p className="text-[color:var(--vd-muted-strong,var(--vd-text))]">
            Wir setzen technisch notwendige Cookies ein, damit Anmeldung, Sitzung
            und Kernfunktionen der App funktionieren. Beim Bezahlen können
            zusätzliche Sicherheits-Cookies von Stripe gesetzt werden. Es gibt
            kein Marketing- oder Analyse-Tracking. Details in der{" "}
            <Link
              href="/datenschutz#cookies"
              className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
            >
              Datenschutzerklärung
            </Link>
            {" "}
            und im{" "}
            <Link
              href="/impressum"
              className="font-medium text-[color:var(--vd-text)] underline-offset-2 hover:underline"
            >
              Impressum
            </Link>
            .
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="min-h-11 w-full shrink-0 sm:w-auto sm:min-w-[9rem]"
          onClick={handleAccept}
        >
          Verstanden
        </Button>
      </div>
    </div>
  );
}
