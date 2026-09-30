import { CompactMetricBar } from "./CompactMetricBar";
import type { ShareCardDensity } from "./share-card-layout";
import type { ShareCardSpecRow } from "./types";

type ShareCardSpecRowViewProps = {
  row: ShareCardSpecRow;
  compact?: boolean;
  density?: ShareCardDensity;
};

export function ShareCardSpecRowView({
  row,
  compact = false,
  density = "comfortable",
}: ShareCardSpecRowViewProps) {
  const dense = density === "dense";
  const tight = density !== "comfortable";
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
        compact={compact || tight}
        dense={dense}
      />
    );
  }

  if (row.layout === "stacked") {
    return (
      <div className={dense ? "space-y-1" : "space-y-2"}>
        <p
          className={`font-mono font-medium uppercase tracking-[0.16em] text-zinc-400 ${
            dense ? "text-[16px]" : tight ? "text-[18px]" : "text-[20px]"
          }`}
        >
          {row.label}
        </p>
        <p
          className={`font-medium leading-snug text-white/90 ${
            dense ? "text-[22px]" : tight ? "text-[24px]" : "text-[28px]"
          }`}
        >
          {row.valueText}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start justify-between gap-4 border-b border-white/5 ${
        dense ? "pb-1.5" : "pb-2.5"
      }`}
    >
      <span
        className={`shrink-0 font-mono font-medium uppercase tracking-[0.14em] text-zinc-400 ${
          dense ? "text-[16px]" : tight ? "text-[18px]" : "text-[20px]"
        }`}
      >
        {row.label}
      </span>
      <span
        className={`min-w-0 text-right font-semibold tabular-nums text-white break-words ${
          dense ? "text-[22px]" : tight ? "text-[26px]" : "text-[30px]"
        }`}
      >
        {row.valueText}
      </span>
    </div>
  );
}
