import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeAppearanceSettings } from "@/components/theme/theme-appearance-settings";
import { getCurrentUser } from "@/lib/auth/get-user";

export const metadata: Metadata = {
  title: "Erscheinungsbild · ZeloxTag",
  description:
    "Hell- oder Dunkelmodus für ZeloxTag — Dark Mode jederzeit deaktivieren.",
};

export default async function SettingsAppearancePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fsettings%2Fappearance");
  }

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-12 pt-6 sm:px-5">
        <div>
          <Link
            href="/settings"
            className="text-[0.8rem] font-medium text-[color:var(--vd-muted)]"
          >
            ← Zurück zu Einstellungen
          </Link>
          <h1 className="claim-title mt-3">Erscheinungsbild</h1>
          <p className="claim-copy mt-1">
            Dark Mode abschalten mit <strong className="font-medium">Hell</strong>
            , oder automatisch an die Systemeinstellung deines Geräts anbinden.
          </p>
        </div>

        <ThemeAppearanceSettings />
      </section>
    </AppShell>
  );
}
