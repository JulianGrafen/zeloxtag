"use client";

import type { ReactNode } from "react";

import { IOSPageHeader } from "@/components/ui/ios";

type SettingsSubpageLayoutProps = {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  children: ReactNode;
};

export function SettingsSubpageLayout({
  title,
  subtitle,
  backHref = "/settings",
  children,
}: SettingsSubpageLayoutProps) {
  return (
    <div className="ios-settings-surface min-h-full bg-[#000000] pb-8">
      <IOSPageHeader
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        backLabel="Einstellungen"
      />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 sm:px-5">
        {children}
      </div>
    </div>
  );
}
