import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MfaSetupPanel } from "@/components/auth/mfa-setup-panel";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/get-user";

export const metadata: Metadata = {
  title: "Zwei-Faktor-Authentifizierung · ZeloxTag",
  description: "Authenticator und Recovery-Codes für dein ZeloxTag-Konto.",
};

export default async function SettingsSecurityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fsettings%2Fsecurity");
  }

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-12 pt-6 sm:px-5">
        <div>
          <Link
            href="/settings"
            className="text-[0.8rem] font-medium text-[color:var(--vd-muted)]"
          >
            ← Zurück zum Konto
          </Link>
          <h1 className="claim-title mt-3">Zwei-Faktor-Authentifizierung (2FA)</h1>
          <p className="claim-copy mt-1">
            Optional: Schütze dein Konto mit einem Authenticator (Google
            Authenticator, 1Password, Authy, …). Nach der Aktivierung brauchst du
            bei jedem Login zusätzlich einen 6-stelligen Code — oder einen
            Recovery-Code, falls die App verloren geht.
          </p>
        </div>

        <section
          aria-label="Zwei-Faktor-Authentifizierung"
          className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
        >
          <MfaSetupPanel showHeader={false} />
        </section>
      </section>
    </AppShell>
  );
}
