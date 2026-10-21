"use client";

import { KeyRound, ShieldCheck } from "lucide-react";

import { IOSGroupedList, IOSListItem } from "@/components/ui/ios";

type SettingsSecuritySectionProps = {
  mfaSubtitle: string;
};

export function SettingsSecuritySection({
  mfaSubtitle,
}: SettingsSecuritySectionProps) {
  return (
    <IOSGroupedList headerTitle="Passwort & Sicherheit">
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
        isLast
      />
    </IOSGroupedList>
  );
}
