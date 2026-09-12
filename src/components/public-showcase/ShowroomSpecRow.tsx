import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { showroom } from "./showroom-styles";

type ShowroomSpecRowProps = {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  layout?: "stacked";
};

export function ShowroomSpecRow({
  label,
  value,
  emphasis = false,
  layout,
}: ShowroomSpecRowProps) {
  if (layout === "stacked") {
    return (
      <div className="flex flex-col gap-2 px-4 py-3.5">
        <span className={showroom.rowLabel}>{label}</span>
        <div
          className={cn(
            "min-w-0 whitespace-pre-wrap",
            emphasis ? showroom.rowValueEmphasis : showroom.body,
          )}
        >
          {value}
        </div>
      </div>
    );
  }

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
