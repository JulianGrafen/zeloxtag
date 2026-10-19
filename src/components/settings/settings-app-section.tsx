"use client";

import { KeyRound, Palette, ShieldCheck } from "lucide-react";

import { MaintenanceEmailSettingsRow } from "@/components/settings/maintenance-email-settings-panel";
import { PwaInstallSettingsPanel } from "@/components/pwa/pwa-install-settings-panel";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { IOSGroupedList, IOSListItem } from "@/components/ui/ios";
import { usePlatformServices } from "@/services/platform/context/platform-services-context";

type SettingsAppSectionProps = {
  mfaSubtitle: string;
  maintenanceEmailReminders: boolean;
};

export function SettingsAppSection({
  mfaSubtitle,
  maintenanceEmailReminders,
}: SettingsAppSectionProps) {
  const { platform } = usePlatformServices();

  return (
    <div className="flex flex-col gap-5">
      <IOSGroupedList headerTitle="App-Einstellungen">
        <IOSListItem
          label="Passwort"
          href="/settings/password"
          icon={<KeyRound className="h-4 w-4" />}
        />
        <IOSListItem
          label="Zwei-Faktor-Authentifizierung"
          sublabel={mfaSubtitle}
          href="/settings/security"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <IOSListItem
          label="Erscheinungsbild"
          sublabel="Hell, Dunkel oder System"
          href="/settings/appearance"
          icon={<Palette className="h-4 w-4" />}
          isLast={platform.isNativeApp}
        />
        {!platform.isNativeApp ? (
          <div className="border-t border-white/[0.07] p-4">
            <PwaInstallSettingsPanel />
          </div>
        ) : null}
      </IOSGroupedList>

      <IOSGroupedList headerTitle="Benachrichtigungen">
        <MaintenanceEmailSettingsRow initialEnabled={maintenanceEmailReminders} />
      </IOSGroupedList>

      <IOSGroupedList headerTitle="Sitzung">
        <div className="px-4 py-4">
          <SignOutButton />
        </div>
      </IOSGroupedList>
    </div>
  );
}
