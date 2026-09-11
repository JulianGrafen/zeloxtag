import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { showroom } from "./showroom-styles";

type ShowroomSpecRowProps = {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
};

export function ShowroomSpecRow({
  label,
  value,
  emphasis = false,
}: ShowroomSpecRowProps) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-4 px-4 py-3",
        emphasis && "border-l-2 border-white/25 pl-3",
      )}
    >
      <span className={showroom.rowLabel}>{label}</span>
      <span
        className={cn(
          "min-w-0",
          emphasis ? showroom.rowValueEmphasis : showroom.rowValue,
        )}
      >
        {value}
      </span>
    </div>
  );
}
