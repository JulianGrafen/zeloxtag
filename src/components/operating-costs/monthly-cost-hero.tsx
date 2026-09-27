import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";

type MonthlyCostHeroProps = {
  monthlyAverage: number;
  windowMonths: number;
  entryCount: number;
};

export function MonthlyCostHero({
  monthlyAverage,
  windowMonths,
  entryCount,
}: MonthlyCostHeroProps) {
  return (
    <div className="rounded-2xl border border-[color:var(--vd-accent)]/35 bg-[color:var(--vd-surface-elevated)] p-5 shadow-[0_0_32px_-8px_color-mix(in_srgb,var(--vd-accent)_45%,transparent)]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[color:var(--vd-muted)]">
        Durchschnittliche Kosten
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[color:var(--vd-text)]">
        {entryCount > 0 ? formatEur(monthlyAverage) : "—"}
        <span className="ml-1 text-[1rem] font-medium text-[color:var(--vd-muted)]">
          / Monat
        </span>
      </p>
      <p className="mt-2 text-[0.78rem] leading-snug text-[color:var(--vd-muted)]">
        Basis: letzte {windowMonths} Monate · Tanken, Versicherung, Steuer &
        Sonstiges
      </p>
    </div>
  );
}
