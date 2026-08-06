import type { TableData } from "@/lib/validations/abeSchema";

type VerwendungsbereichTableProps = {
  table: TableData;
  /** Highlight row matching the user's garage vehicle. */
  highlightMatches?: boolean;
  className?: string;
};

/**
 * Read-only Verwendungsbereich / Fahrzeugfreigaben table (Hersteller · Typ · Modell).
 */
export function VerwendungsbereichTable({
  table,
  highlightMatches = true,
  className = "",
}: VerwendungsbereichTableProps) {
  if (!table.rows.length) return null;

  return (
    <div
      className={[
        "overflow-x-auto rounded-xl border border-[color:var(--vd-border)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <table className="min-w-full border-collapse text-left text-[0.82rem]">
        <caption className="sr-only">
          {table.caption?.trim() || "Verwendungsbereich"}
        </caption>
        <thead>
          <tr className="border-b border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]">
            {table.headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => {
            const matched = highlightMatches && row.isUserVehicleMatch;
            return (
              <tr
                key={row.id}
                className={[
                  "border-b border-[color:var(--vd-border)] last:border-b-0",
                  matched ? "bg-emerald-500/8" : "bg-[color:var(--vd-surface)]",
                ].join(" ")}
              >
                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.id}-${index}`}
                    className="px-3 py-2.5 align-top leading-relaxed text-[color:var(--vd-text)]"
                  >
                    {cell.trim() || "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
