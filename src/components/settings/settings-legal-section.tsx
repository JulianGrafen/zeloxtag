"use client";

import { useState } from "react";
import { FileText, LifeBuoy, Shield } from "lucide-react";

import { AccountDeletionPanel } from "@/components/account/account-deletion-panel";
import type { AccountDeletionState } from "@/lib/account/account-deletion-shared";
import { IOSGroupedList, IOSListItem } from "@/components/ui/ios";

const SUPPORT_EMAIL = "support@zeloxtag.de";

type SettingsLegalSectionProps = {
  userEmail: string;
  hasPasswordLogin: boolean;
  deletionState: AccountDeletionState;
};

export function SettingsLegalSection({
  userEmail,
  hasPasswordLogin,
  deletionState,
}: SettingsLegalSectionProps) {
  const [showDeletion, setShowDeletion] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <IOSGroupedList headerTitle="Rechtliches & Support">
        <IOSListItem
          label="Datenschutz"
          href="/datenschutz"
          icon={<Shield className="h-4 w-4" />}
        />
        <IOSListItem
          label="AGB"
          href="/agb"
          icon={<FileText className="h-4 w-4" />}
        />
        <IOSListItem
          label="Impressum"
          href="/impressum"
          icon={<FileText className="h-4 w-4" />}
        />
        <IOSListItem
          label="Support kontaktieren"
          value={SUPPORT_EMAIL}
          href={`mailto:${SUPPORT_EMAIL}`}
          icon={<LifeBuoy className="h-4 w-4" />}
          isLast
        />
      </IOSGroupedList>

      <IOSGroupedList
        headerTitle="Gefahrzone"
        footerText="Account-Löschung ist unwiderruflich nach Ablauf der Schonfrist."
      >
        <IOSListItem
          label="Account löschen"
          destructive
          isLast
          onPress={() => setShowDeletion((open) => !open)}
          showChevron
        />
      </IOSGroupedList>

      {showDeletion ? (
        <div className="min-w-0 max-w-full overflow-x-clip">
        <AccountDeletionPanel
          userEmail={userEmail}
          hasPasswordLogin={hasPasswordLogin}
          deletionState={deletionState}
        />
        </div>
      ) : null}
    </div>
  );
}
