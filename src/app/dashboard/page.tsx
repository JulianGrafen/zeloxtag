import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/get-user";
import { resolvePostLoginPath } from "@/lib/auth/post-login-path";
import { AppShell } from "@/components/layout/app-shell";
import { PressableButton } from "@/components/vehicle-dashboard/Pressable";

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

  // No linked vehicle yet — lightweight hub (not the vehicle tile menu).
  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-12 pt-6 sm:px-5">
        <div className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-6 shadow-[var(--vd-shadow)]">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-[color:var(--vd-muted)]">
            Dashboard
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.7rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Willkommen zurück
          </h1>
          <p className="mt-2 text-[0.92rem] text-[color:var(--vd-muted)]">
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
          <Link
            href="/settings"
            className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
          >
            <span className="block text-[0.9rem] font-semibold text-[color:var(--vd-text)]">
              2FA
            </span>
            <span className="mt-1 block text-[0.78rem] font-normal text-[color:var(--vd-muted)]">
              Zwei-Faktor aktivieren
            </span>
          </Link>
          <Link
            href="/qr"
            className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]"
          >
            <span className="block text-[0.9rem] font-semibold text-[color:var(--vd-text)]">
              QR / Tag testen
            </span>
            <span className="mt-1 block text-[0.78rem] font-normal text-[color:var(--vd-muted)]">
              Inventory & Mint
            </span>
          </Link>
        </div>

        <form action={signOut}>
          <PressableButton
            type="submit"
            variant="button"
            className="inline-flex w-full justify-center rounded-2xl border border-[color:var(--vd-border)] bg-white px-4 py-3.5 text-[0.88rem] font-semibold text-[color:var(--vd-text)]"
          >
            Abmelden
          </PressableButton>
        </form>
      </section>
    </AppShell>
  );
}
