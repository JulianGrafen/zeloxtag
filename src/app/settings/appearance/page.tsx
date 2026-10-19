import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SettingsSubpageLayout } from "@/components/settings/settings-subpage-layout";
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
      <SettingsSubpageLayout
        title="Erscheinungsbild"
        subtitle={
          <>
            Dark Mode abschalten mit <strong className="font-medium">Hell</strong>
            , oder automatisch an die Systemeinstellung deines Geräts anbinden.
          </>
        }
      >
        <ThemeAppearanceSettings />
      </SettingsSubpageLayout>
    </AppShell>
  );
}
