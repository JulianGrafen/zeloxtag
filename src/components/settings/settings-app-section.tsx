"use client";

import { MaintenanceEmailSettingsRow } from "@/components/settings/maintenance-email-settings-panel";
import { IOSGroupedList } from "@/components/ui/ios";

type SettingsNotificationsSectionProps = {
  maintenanceEmailReminders: boolean;
};

export function SettingsNotificationsSection({
  maintenanceEmailReminders,
}: SettingsNotificationsSectionProps) {
  return (
    <IOSGroupedList headerTitle="Benachrichtigungen">
      <MaintenanceEmailSettingsRow initialEnabled={maintenanceEmailReminders} />
    </IOSGroupedList>
  );
}
