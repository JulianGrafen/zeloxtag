import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { showroom } from "./showroom-styles";

type ShowroomGroupProps = {
  children: ReactNode;
  className?: string;
  /** Subtle top hairline accent (e.g. Showcase group). */
  accent?: boolean;
};

export function ShowroomGroup({
  children,
  className,
  accent = false,
}: ShowroomGroupProps) {
  return (
    <div
      className={cn(
        showroom.group,
        "divide-y divide-white/10",
        accent && showroom.groupAccent,
        className,
      )}
    >
      {children}
    </div>
  );
}
