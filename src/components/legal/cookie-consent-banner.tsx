"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  acceptCookieConsent,
  hasCookieConsent,
  rejectCookieConsent,
} from "@/lib/legal/cookie-consent-client";

const TITLE_ID = "zt-cookie-consent-title";

/** Above legal footer links (z-100) and dashboard chrome; below modals/lightbox. */
const BANNER_Z = "z-[120]";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setVisible(!hasCookieConsent());
  }, []);

  function handleAccept() {
    acceptCookieConsent();
    setVisible(false);
  }

  function handleReject() {
    rejectCookieConsent();
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      role="dialog"
      aria-labelledby={TITLE_ID}
      aria-modal="false"
      className={`pointer-events-none fixed inset-x-0 bottom-0 ${BANNER_Z} flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3`}
    >
      <div className="pointer-events-auto vd-surface-card flex w-full max-w-lg flex-col gap-4 border border-[color:var(--vd-border)] p-4 shadow-lg sm:flex-row sm:items-end sm:gap-5">
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
            </Link>{" "}
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
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[9.5rem]">
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            onClick={handleAccept}
          >
            Zustimmen
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 w-full"
            onClick={handleReject}
          >
            Ablehnen
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
