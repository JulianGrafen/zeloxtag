import { CheckCircle2 } from "lucide-react";

import type { TableData } from "@/lib/validations/abeSchema";

type VerwendungsbereichTableProps = {
  table: TableData;
  /** Highlight row matching the user's garage vehicle. */
  highlightMatches?: boolean;
  /** Green checkmark on each row (Freigabe list). */
  showApprovalCheck?: boolean;
  className?: string;
};

/**
 * Read-only Verwendungsbereich / Fahrzeugfreigaben table (verbatim document copy).
 */
export function VerwendungsbereichTable({
  table,
  highlightMatches = true,
  showApprovalCheck = false,
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
                {row.cells.map((cell, index) => {
                  const value = cell.trim() || "—";
                  const showCheck = showApprovalCheck && index === 0;
                  return (
                    <td
                      key={`${row.id}-${index}`}
                      className="px-3 py-2.5 align-top whitespace-pre-wrap leading-relaxed text-[color:var(--vd-text)]"
                    >
                      {showCheck ? (
                        <span className="flex items-start gap-2">
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                            aria-hidden
                          />
                          <span>{value}</span>
                        </span>
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
