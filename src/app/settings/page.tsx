import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { AppShell } from "@/components/layout/app-shell";
import { MfaSetupPanel } from "@/components/auth/mfa-setup-panel";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata: Metadata = {
  title: "Konto · ZeloxTag",
  description: "Konto, Sicherheit und Abmelden für ZeloxTag.",
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
            ← Zurück zum Dashboard
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[1.6rem] font-semibold tracking-[-0.035em] text-[color:var(--vd-text)]">
            Konto
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--vd-muted)]">
            Sicherheit & Sitzung ·{" "}
            <span className="font-medium text-[color:var(--vd-text)]">
              {user.email ?? user.id}
            </span>
          </p>
        </div>

        <MfaSetupPanel />

        <section
          aria-label="Sitzung"
          className="rounded-[1.75rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
        >
          <h2 className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold tracking-[-0.03em] text-[color:var(--vd-text)]">
            Sitzung
          </h2>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-[color:var(--vd-muted)]">
            Melde dich ab, wenn du dieses Gerät nicht mehr nutzen willst.
          </p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </section>
      </section>
    </AppShell>
  );
}
