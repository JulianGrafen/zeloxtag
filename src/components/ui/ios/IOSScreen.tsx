import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Forced OLED-dark surface. `.dark` remaps every `--vd-*` token for the subtree,
 * so nested legacy components render dark even when the app theme is light.
 */
export const IOS_SCREEN_CLASS =
  "dark ios-settings-surface bg-black text-white [color-scheme:dark]";

export type IOSScreenProps = {
  children: ReactNode;
  className?: string;
};

export function IOSScreen({ children, className }: IOSScreenProps) {
  return (
    <div
      className={cn(
        IOS_SCREEN_CLASS,
        "relative min-h-dvh overflow-x-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
