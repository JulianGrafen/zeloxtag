import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import { isOperatorEmail } from "@/lib/auth/require-operator";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Dashboard · ZeloxTag",
  description: "Geschützter Eigentümer-Bereich.",
};

/**
 * Account entry: owners with an active tag are sent to the vehicle tile
 * dashboard (`/v/{uuid}`). 2FA lives there as a normal menu tile.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/?next=/dashboard");
  }

  const destination = await resolvePostLoginPath(user.id);
  if (destination.startsWith("/v/")) {
    redirect(destination);
  }

  const superuser = isOperatorEmail(user.email);

  // No linked vehicle yet — lightweight hub (not the vehicle tile menu).
  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-12 pt-6 sm:px-5">
        <div className="vd-surface-card p-6">
          <p className="claim-kicker">Dashboard</p>
          <h1 className="claim-title mt-2">Willkommen zurück</h1>
          <p className="claim-copy mt-2">
            Angemeldet als{" "}
            <span className="font-medium text-[color:var(--vd-text)]">
              {user.email ?? user.id}
            </span>
          </p>
          <p className="mt-3 text-[0.88rem] leading-relaxed text-[color:var(--vd-muted)]">
            Scanne deinen ZeloxTag-QR-Code, um das Fahrzeug-Dashboard zu öffnen.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/settings" className="vd-tile block p-4 transition-shadow hover:shadow-[var(--vd-shadow-hover)]">
            <span className="block text-[0.9rem] font-semibold text-[color:var(--vd-text)]">
              Konto
            </span>
            <span className="mt-1 block text-[0.78rem] font-normal text-[color:var(--vd-muted)]">
              2FA & Abmelden
            </span>
          </Link>
          {superuser ? (
            <Link href="/qr" className="vd-tile block p-4 transition-shadow hover:shadow-[var(--vd-shadow-hover)]">
              <span className="block text-[0.9rem] font-semibold text-[color:var(--vd-text)]">
                Tag minten
              </span>
              <span className="mt-1 block text-[0.78rem] font-normal text-[color:var(--vd-muted)]">
                SVG für Laser · nur Superuser
              </span>
            </Link>
          ) : null}
        </div>

        <SignOutButton />
      </section>
    </AppShell>
  );
}
