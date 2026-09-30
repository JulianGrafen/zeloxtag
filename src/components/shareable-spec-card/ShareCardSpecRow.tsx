import { CompactMetricBar } from "./CompactMetricBar";
import type { ShareCardSpecRow } from "./types";

type ShareCardSpecRowViewProps = {
  row: ShareCardSpecRow;
  compact?: boolean;
};

export function ShareCardSpecRowView({ row, compact = false }: ShareCardSpecRowViewProps) {
  if (row.layout === "quartett" && row.quartett) {
    const lowerIsBetter = row.quartett.polarity === "lower";
    return (
      <CompactMetricBar
        label={row.label}
        valueText={row.valueText}
        amount={row.quartett.amount}
        scaleMax={row.quartett.scaleMax}
        scaleMin={row.quartett.scaleMin}
        lowerIsBetter={lowerIsBetter}
        compact={compact}
      />
    );
  }

  if (row.layout === "stacked") {
    return (
      <div className="space-y-2">
        <p className="font-mono text-[20px] font-medium uppercase tracking-[0.18em] text-zinc-400">
          {row.label}
        </p>
        <p className="text-[28px] font-medium leading-snug text-white/90">
          {row.valueText}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-white/5 pb-3">
      <span className="font-mono text-[20px] font-medium uppercase tracking-[0.16em] text-zinc-400">
        {row.label}
      </span>
      <span className="text-right text-[30px] font-semibold tabular-nums text-white">
        {row.valueText}
      </span>
    </div>
  );
}
