import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChangePasswordPanel } from "@/components/auth/change-password-panel";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsSubpageLayout } from "@/components/settings/settings-subpage-layout";
import { IOSGroupedList } from "@/components/ui/ios";
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
      <SettingsSubpageLayout
        title="Passwort"
        subtitle={
          hasPasswordLogin
            ? "Ändere dein Anmeldepasswort. Mindestens 10 Zeichen."
            : "Lege ein Passwort fest, um dich künftig zusätzlich per E-Mail anzumelden."
        }
      >
        <IOSGroupedList>
          <div className="p-4">
            <ChangePasswordPanel
              hasPasswordLogin={hasPasswordLogin}
              showHeader={false}
            />
          </div>
        </IOSGroupedList>
      </SettingsSubpageLayout>
    </AppShell>
  );
}
