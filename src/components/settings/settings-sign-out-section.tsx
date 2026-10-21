"use client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { IOSGroupedList } from "@/components/ui/ios";

export function SettingsSignOutSection() {
  return (
    <IOSGroupedList>
      <div className="px-4 py-4">
        <SignOutButton />
      </div>
    </IOSGroupedList>
  );
}
