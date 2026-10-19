import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MfaSetupPanel } from "@/components/auth/mfa-setup-panel";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsSubpageLayout } from "@/components/settings/settings-subpage-layout";
import { IOSGroupedList } from "@/components/ui/ios";
import { getCurrentUser } from "@/lib/auth/get-user";

export const metadata: Metadata = {
  title: "Zwei-Faktor-Authentifizierung · ZeloxTag",
  description: "Authenticator und Recovery-Codes für dein ZeloxTag-Konto.",
};

export default async function SettingsSecurityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fsettings%2Fsecurity");
  }

  return (
    <AppShell>
      <SettingsSubpageLayout
        title="Zwei-Faktor-Authentifizierung (2FA)"
        subtitle={
          <>
            Optional: Schütze dein Konto mit einem Authenticator (Google
            Authenticator, 1Password, Authy, …). Nach der Aktivierung brauchst
            du bei jedem Login zusätzlich einen 6-stelligen Code — oder einen
            Recovery-Code, falls die App verloren geht.
          </>
        }
      >
        <IOSGroupedList>
          <div className="p-4">
            <MfaSetupPanel showHeader={false} />
          </div>
        </IOSGroupedList>
      </SettingsSubpageLayout>
    </AppShell>
  );
}
