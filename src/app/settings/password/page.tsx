import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ChangePasswordPanel } from "@/components/auth/change-password-panel";
import { AppShell } from "@/components/layout/app-shell";
import { accountHasPasswordLogin } from "@/lib/auth/account-password";
import { getCurrentUser } from "@/lib/auth/get-user";

export const metadata: Metadata = {
  title: "Passwort · ZeloxTag",
  description: "Anmeldepasswort für ZeloxTag ändern oder festlegen.",
};

export default async function SettingsPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fsettings%2Fpassword");
  }

  const hasPasswordLogin = accountHasPasswordLogin(user);

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
          <h1 className="claim-title mt-3">Passwort</h1>
          <p className="claim-copy mt-1">
            {hasPasswordLogin
              ? "Ändere dein Anmeldepasswort. Mindestens 10 Zeichen."
              : "Lege ein Passwort fest, um dich künftig zusätzlich per E-Mail anzumelden."}
          </p>
        </div>

        <section
          aria-label="Passwort"
          className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-5 shadow-[var(--vd-shadow-sm)]"
        >
          <ChangePasswordPanel
            hasPasswordLogin={hasPasswordLogin}
            showHeader={false}
          />
        </section>
      </section>
    </AppShell>
  );
}
