"use client";

import { MaintenanceEmailSettingsRow } from "@/components/settings/maintenance-email-settings-panel";
import { TagScanEmailSettingsRow } from "@/components/settings/tag-scan-email-settings-row";
import { IOSGroupedList } from "@/components/ui/ios";

type SettingsNotificationsSectionProps = {
  maintenanceEmailReminders: boolean;
  tagScanEmailNotifications: boolean;
};

export function SettingsNotificationsSection({
  maintenanceEmailReminders,
  tagScanEmailNotifications,
}: SettingsNotificationsSectionProps) {
  return (
    <IOSGroupedList headerTitle="Benachrichtigungen">
      <MaintenanceEmailSettingsRow initialEnabled={maintenanceEmailReminders} />
      <TagScanEmailSettingsRow initialEnabled={tagScanEmailNotifications} />
    </IOSGroupedList>
  );
}
