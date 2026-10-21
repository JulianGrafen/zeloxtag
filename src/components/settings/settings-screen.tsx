"use client";

import type { ReactNode } from "react";

import { AccountDeletionBanner } from "@/components/account/account-deletion-banner";
import type { AccountDeletionState } from "@/lib/account/account-deletion-shared";
import { NativeRestorePurchasesButton } from "@/components/billing/native-restore-purchases-button";
import { IOSGroupedList, IOSListItem, IOSPageHeader } from "@/components/ui/ios";

import { SettingsNotificationsSection } from "./settings-app-section";
import { SettingsGeneralSection } from "./settings-locale-section";
import { SettingsLegalSection } from "./settings-legal-section";
import { SettingsSecuritySection } from "./settings-security-section";
import { SettingsSignOutSection } from "./settings-sign-out-section";

export type SettingsScreenProps = {
  email: string;
  dashboardHref: string;
  mfaSubtitle: string;
  maintenanceEmailReminders: boolean;
  deletionState: AccountDeletionState;
  hasPasswordLogin: boolean;
  membershipSection: ReactNode;
};

export function SettingsScreen({
  email,
  dashboardHref,
  mfaSubtitle,
  maintenanceEmailReminders,
  deletionState,
  hasPasswordLogin,
  membershipSection,
}: SettingsScreenProps) {
  return (
    <div className="ios-settings-surface min-h-full bg-[#000000] pb-8">
      <IOSPageHeader
        title="Einstellungen"
        subtitle={
          <>
            Konto ·{" "}
            <span className="font-medium text-white">{email}</span>
          </>
        }
        backHref={dashboardHref}
        backLabel="Garage"
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 sm:px-5">
        {deletionState.status === "grace" && deletionState.graceEndsAt ? (
          <AccountDeletionBanner graceEndsAt={deletionState.graceEndsAt} />
        ) : null}

        <IOSGroupedList headerTitle="Konto">
          <IOSListItem label="Profil" value={email} showChevron={false} />
          <div className="border-t border-white/[0.07] px-4 py-3">
            {membershipSection}
          </div>
          <NativeRestorePurchasesButton />
        </IOSGroupedList>

        <SettingsSecuritySection mfaSubtitle={mfaSubtitle} />

        <SettingsGeneralSection />

        <SettingsNotificationsSection
          maintenanceEmailReminders={maintenanceEmailReminders}
        />

        <SettingsLegalSection
          userEmail={email}
          hasPasswordLogin={hasPasswordLogin}
          deletionState={deletionState}
        />

        <SettingsSignOutSection />
      </div>
    </div>
  );
}
