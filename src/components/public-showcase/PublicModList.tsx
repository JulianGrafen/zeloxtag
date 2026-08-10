import { Wrench } from "lucide-react";

import { formatEur } from "@/components/vehicle-dashboard/invoiceDocuments";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";

type PublicModListProps = {
  modifications: PublicModification[];
  hideFinancials: boolean;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PublicModList({
  modifications,
  hideFinancials,
}: PublicModListProps) {
  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
        <Wrench className="h-3.5 w-3.5" aria-hidden />
        Umbauten &amp; Teile
      </h2>
      <p className="mb-4 text-[0.82rem] text-[color:var(--vd-muted)]">
        Automatisch aus Rechnungen und Umbau-Einträgen extrahiert.
      </p>

      {modifications.length === 0 ? (
        <p className="text-[0.88rem] text-[color:var(--vd-muted)]">
          Noch keine Umbauten erkannt.
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-[color:var(--vd-border)]">
          {modifications.map((mod, index) => {
            const dateLabel = formatDate(mod.date);
            return (
              <li
                key={mod.id}
                className={[
                  "flex items-start justify-between gap-3 px-3 py-3 text-[0.88rem]",
                  index % 2 === 0
                    ? "bg-[color:var(--vd-surface)]"
                    : "bg-[color:var(--vd-surface-elevated)]/80",
                  index > 0 ? "border-t border-[color:var(--vd-border)]/60" : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="font-medium leading-snug text-[color:var(--vd-text)]">
                    {mod.label}
                  </p>
                  <p className="mt-0.5 text-[0.78rem] text-[color:var(--vd-muted)]">
                    {[mod.vendor, dateLabel].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {!hideFinancials && mod.amount != null ? (
                  <span className="shrink-0 font-semibold tabular-nums text-[color:var(--vd-text)]">
                    {formatEur(mod.amount)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
