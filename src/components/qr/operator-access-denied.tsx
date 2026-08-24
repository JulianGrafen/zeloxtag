import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { ScanContent } from "@/components/layout/scan-content";
import type { OperatorDenialCode } from "@/lib/auth/require-operator";

interface OperatorAccessDeniedProps {
  code: OperatorDenialCode;
  userEmail?: string | null;
}

function denialCopy(code: OperatorDenialCode): {
  title: string;
  body: string;
  steps: string[];
} {
  switch (code) {
    case "superuser_not_configured":
      return {
        title: "Minter nicht freigeschaltet",
        body: "In Production fehlt die Superuser-Konfiguration.",
        steps: [
          "Vercel → Project → Settings → Environment Variables",
          "ZELOXTAG_SUPERUSER_EMAIL auf genau eine E-Mail setzen (z. B. julian@zeloxtag.de)",
          "Nicht mehrere Adressen in ZELOXTAG_OPERATOR_EMAILS — das sperrt den Minter",
          "Neu deployen und diese Seite erneut öffnen",
        ],
      };
    case "not_superuser":
      return {
        title: "Kein Superuser-Konto",
        body: "Der Minter ist nur für den konfigurierten Superuser erreichbar.",
        steps: [
          "Mit dem in ZELOXTAG_SUPERUSER_EMAIL hinterlegten Konto anmelden",
          "Oder die Env-Variable auf deine Login-E-Mail anpassen und neu deployen",
        ],
      };
    case "mfa_required":
      return {
        title: "2FA erforderlich",
        body: "Tag-Minting ist nur mit abgeschlossener Zwei-Faktor-Authentifizierung möglich.",
        steps: [
          "Unter Konto 2FA aktivieren (Authenticator-App)",
          "Nach dem Login den 6-stelligen Code eingeben",
          "Danach /qr erneut aufrufen",
        ],
      };
    case "mfa_unavailable":
      return {
        title: "2FA-Status nicht verfügbar",
        body: "Die Sitzung konnte nicht auf AAL2 geprüft werden.",
        steps: [
          "Abmelden und erneut anmelden",
          "2FA-Challenge abschließen",
          "Seite neu laden",
        ],
      };
    default:
      return {
        title: "Anmeldung erforderlich",
        body: "Bitte anmelden, um Tags zu minten.",
        steps: ["Mit Superuser-Konto anmelden", "2FA abschließen"],
      };
  }
}

export function OperatorAccessDenied({
  code,
  userEmail,
}: OperatorAccessDeniedProps) {
  const copy = denialCopy(code);

  return (
    <AppShell showNavbar={false}>
      <ScanContent className="gap-6 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="space-y-2">
          <p className="claim-kicker">ZeloxTag · Superuser</p>
          <h1 className="claim-title">{copy.title}</h1>
          <p className="claim-copy text-[0.9rem]">{copy.body}</p>
          {userEmail ? (
            <p className="text-[0.82rem] text-[color:var(--vd-muted)]">
              Angemeldet als{" "}
              <span className="font-medium text-[color:var(--vd-text)]">
                {userEmail}
              </span>
            </p>
          ) : null}
        </header>

        <section className="vd-surface-card space-y-3 p-5 shadow-[var(--vd-shadow-sm)]">
          <h2 className="font-[family-name:var(--font-display)] text-[1rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            So erreichst du den Minter
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
            {copy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col gap-3">
          {code === "mfa_required" || code === "mfa_unavailable" ? (
            <Link
              href="/settings"
              className="claim-cta inline-flex w-full justify-center no-underline"
            >
              2FA unter Konto einrichten
            </Link>
          ) : null}
          <Link
            href="/login?next=/qr"
            className="claim-back inline-flex w-full justify-center no-underline"
          >
            Neu anmelden
          </Link>
        </div>

        <p className="text-center text-[0.78rem] text-[color:var(--vd-muted)]">
          Direkt-URL:{" "}
          <span className="font-mono text-[color:var(--vd-text)]">/qr</span>
        </p>
      </ScanContent>
    </AppShell>
  );
}
