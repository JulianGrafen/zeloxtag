import { cn } from "@/lib/utils";

export type TelemetryValueVariant = "default" | "mono" | "hero";

const TELEMETRY_VARIANT_CLASS: Record<TelemetryValueVariant, string> = {
  default: "font-medium text-white",
  mono: "font-mono text-xs text-zinc-300",
  hero: "text-4xl font-bold tracking-tight text-white",
};

export type TelemetryValueProps = {
  value: string;
  unit?: string;
  variant?: TelemetryValueVariant;
  className?: string;
};

/** Numeric readout — always tabular so decimals align across rows. */
export function TelemetryValue({
  value,
  unit,
  variant = "default",
  className,
}: TelemetryValueProps) {
  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        TELEMETRY_VARIANT_CLASS[variant],
        className,
      )}
    >
      {value}
      {unit ? <span className="ml-1 text-[#8E8E93]">{unit}</span> : null}
    </span>
  );
}
