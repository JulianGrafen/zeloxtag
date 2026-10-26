import type { ReactNode } from "react";

import { IOS_CARD, TelemetryValue } from "@/components/ui/ios";
import { cn } from "@/lib/utils";

export type CostKpi = {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
};

type CostKpiCardProps = {
  hero: CostKpi;
  kpis?: CostKpi[];
  /** Rendered under the hero value, above the KPI grid (e.g. a split bar). */
  heroAccessory?: ReactNode;
  className?: string;
};

const KPI_LABEL_CLASS = "text-xs font-medium text-[#8E8E93]";
const HAIRLINE_CLASS = "border-white/[0.08]";

function KpiCell({ kpi, wide }: { kpi: CostKpi; wide: boolean }) {
  return (
    <div className={cn("min-w-0 bg-[#1C1C1E] px-4 py-3", wide && "col-span-2")}>
      <p className={KPI_LABEL_CLASS}>{kpi.label}</p>
      <TelemetryValue
        value={kpi.value}
        unit={kpi.unit}
        className="mt-0.5 block text-[17px] font-semibold"
      />
      {kpi.hint ? (
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[#8E8E93]">
          {kpi.hint}
        </p>
      ) : null}
    </div>
  );
}

/** One flat card: hero figure on top, plain label/value pairs in a hairline grid below. */
export function CostKpiCard({ hero, kpis = [], heroAccessory, className }: CostKpiCardProps) {
  const hasOddCount = kpis.length % 2 === 1;

  return (
    <section className={cn("overflow-hidden", IOS_CARD, className)}>
      <div className="px-4 pb-4 pt-3.5">
        <p className={KPI_LABEL_CLASS}>{hero.label}</p>
        <TelemetryValue
          value={hero.value}
          unit={hero.unit}
          variant="hero"
          className="mt-1 block"
        />
        {hero.hint ? (
          <p className="mt-1.5 text-xs leading-snug text-[#8E8E93]">{hero.hint}</p>
        ) : null}
        {heroAccessory ? <div className="mt-4">{heroAccessory}</div> : null}
      </div>
      {kpis.length > 0 ? (
        <div className={cn("grid grid-cols-2 gap-px border-t bg-white/[0.08]", HAIRLINE_CLASS)}>
          {kpis.map((kpi, index) => (
            <KpiCell
              key={kpi.label}
              kpi={kpi}
              wide={hasOddCount && index === kpis.length - 1}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
