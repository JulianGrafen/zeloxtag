import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SettingsLocaleSection } from "@/components/settings/settings-locale-section";
import { SettingsSubpageLayout } from "@/components/settings/settings-subpage-layout";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getRequestLocalePreferences } from "@/lib/i18n/get-request-locale";
import { uiMessages } from "@/lib/i18n/messages";

export async function generateMetadata(): Promise<Metadata> {
  const prefs = await getRequestLocalePreferences();
  const m = uiMessages(prefs.locale);
  return {
    title: `${m.settingsLanguageTitle} · ZeloxTag`,
    description: m.settingsLanguageIntro,
  };
}

export default async function SettingsLanguagePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=%2Fsettings%2Flanguage");
  }

  const prefs = await getRequestLocalePreferences();
  const m = uiMessages(prefs.locale);

  return (
    <AppShell>
      <SettingsSubpageLayout
        title={m.settingsLanguageTitle}
        subtitle={m.settingsLanguageIntro}
      >
        <SettingsLocaleSection />
      </SettingsSubpageLayout>
    </AppShell>
  );
}
