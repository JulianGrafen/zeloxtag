import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { AppShell } from "@/components/layout/app-shell";
import { MfaSetupPanel } from "@/components/auth/mfa-setup-panel";

export const metadata: Metadata = {
  title: "Einstellungen · ZeloxTag",
  description: "Konto-Einstellungen und Zwei-Faktor-Authentifizierung.",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-12 pt-6 sm:px-5">
        <div>
          <Link
            href="/dashboard"
            className="text-[0.8rem] font-medium text-[color:var(--vd-muted)]"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[1.6rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Einstellungen
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
            Konto & Sicherheit · angemeldet als{" "}
            <span className="font-medium text-[color:var(--vd-text)]">
              {user.email ?? user.id}
            </span>
          </p>
        </div>

        <section aria-labelledby="settings-2fa-heading" className="space-y-3">
          <div className="px-1">
            <h2
              id="settings-2fa-heading"
              className="font-[family-name:var(--font-display)] text-[0.72rem] font-semibold tracking-[0.16em] text-[color:var(--vd-muted)] uppercase"
            >
              Sicherheit
            </h2>
            <p className="mt-1 text-[0.85rem] text-[color:var(--vd-muted)]">
              Zwei-Faktor-Authentifizierung (2FA) für dein ZeloxTag-Konto.
            </p>
          </div>
          <MfaSetupPanel />
        </section>
      </section>
    </AppShell>
  );
}
