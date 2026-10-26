import { formatCurrencyEUR } from "@/utils/formatters";

import { CostKpiCard } from "./cost-kpi-card";

type MonthlyCostHeroProps = {
  monthlyAverage: number;
  windowTotal: number;
  windowMonths: number;
  entryCount: number;
};

export function MonthlyCostHero({
  monthlyAverage,
  windowTotal,
  windowMonths,
  entryCount,
}: MonthlyCostHeroProps) {
  const hasEntries = entryCount > 0;

  return (
    <CostKpiCard
      hero={{
        label: "Ø Kosten pro Monat",
        value: hasEntries ? formatCurrencyEUR(monthlyAverage) : "—",
        hint: `Basis: letzte ${windowMonths} Monate · Tanken, Versicherung, Steuer & Sonstiges`,
      }}
      kpis={[
        {
          label: `Gesamt · ${windowMonths} Monate`,
          value: hasEntries ? formatCurrencyEUR(windowTotal) : "—",
        },
        {
          label: "Einträge",
          value: entryCount.toLocaleString("de-DE"),
        },
      ]}
    />
  );
}
