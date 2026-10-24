import { cn } from "@/lib/utils";

export const documentDetailMetadataListClassName = cn(
  "overflow-hidden rounded-xl border border-[color:var(--vd-border)]",
  "divide-y divide-[color:var(--vd-border)]/70",
);

export const documentDetailMetadataRowClassName = "px-4 py-3.5 sm:px-4";

export const documentDetailMetadataKickerClassName =
  "text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]";

export const documentDetailMetadataValueClassName =
  "text-[0.9rem] font-semibold tracking-[-0.02em] text-[color:var(--vd-text)]";
