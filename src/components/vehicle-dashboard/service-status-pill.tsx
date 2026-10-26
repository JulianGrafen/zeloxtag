import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusPillTone = "green" | "amber" | "red" | "neutral";

const STATUS_PILL_TONE_CLASS: Record<StatusPillTone, string> = {
  green: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  red: "bg-red-500/15 text-red-400",
  neutral: "bg-zinc-500/20 text-zinc-300",
};

export function StatusPill({
  tone,
  children,
}: {
  tone: StatusPillTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        STATUS_PILL_TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}

export type IntervalRecordStatus = "aktuell" | "erledigt";

export function IntervalRecordStatusPill({
  status,
}: {
  status: IntervalRecordStatus;
}) {
  return status === "aktuell" ? (
    <StatusPill tone="green">Aktuell</StatusPill>
  ) : (
    <StatusPill tone="neutral">Erledigt</StatusPill>
  );
}
