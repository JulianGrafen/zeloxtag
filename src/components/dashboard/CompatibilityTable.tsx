"use client";

import type { KeyboardEvent } from "react";

import { Badge } from "@/components/ui/badge";
import type { TableData } from "@/lib/validations/abeSchema";

export type CompatibilityTableProps = {
  table: TableData;
  /** Optional heading above the table (defaults to caption or Verwendungsbereich). */
  title?: string;
  className?: string;
  /** When set, rows become tappable and this row is highlighted. */
  selectedRowId?: string | null;
  onSelectRow?: (rowId: string) => void;
};

/**
 * Accessible Verwendungsbereich table.
 * Expects match flags already applied by {@link TableMatchingService}.
 */
export function CompatibilityTable({
  table,
  title,
  className = "",
  selectedRowId = null,
  onSelectRow,
}: CompatibilityTableProps) {
  const selectable = Boolean(onSelectRow);
  const heading = title ?? table.caption ?? "Verwendungsbereich";
  const columnCount = Math.max(
    table.headers.length,
    ...table.rows.map((row) => row.cells.length),
    1,
  );
  const headers =
    table.headers.length >= columnCount
      ? table.headers
      : [
          ...table.headers,
          ...Array.from(
            { length: columnCount - table.headers.length },
            (_, index) => `Spalte ${table.headers.length + index + 1}`,
          ),
        ];

  return (
    <section
      className={[
        "rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={heading}
    >
      <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
        {heading}
      </h2>

      <div className="overflow-x-auto rounded-xl border border-[color:var(--vd-border)]">
        <table className="w-full min-w-[36rem] border-collapse text-left text-[0.82rem]">
          <caption className="sr-only">{heading}</caption>
          <thead>
            <tr className="border-b border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]">
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2.5 font-semibold text-[color:var(--vd-text)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => {
              const selected = selectable && selectedRowId === row.id;
              const matched = selected || (!selectable && row.isUserVehicleMatch);
              const rowClassName = [
                "border-b border-[color:var(--vd-border)] last:border-b-0",
                matched
                  ? "border-l-4 border-l-emerald-600 bg-emerald-500/10 text-emerald-950 dark:border-l-emerald-400 dark:bg-emerald-950/30 dark:text-emerald-50"
                  : [
                      rowIndex % 2 === 0
                        ? "bg-[color:var(--vd-surface)]"
                        : "bg-[color:var(--vd-surface-elevated)]/60",
                      selectable
                        ? "cursor-pointer active:bg-neutral-100"
                        : "hover:bg-[color:var(--vd-surface-elevated)]",
                    ].join(" "),
              ].join(" ");

              return (
                <tr
                  key={row.id}
                  className={rowClassName}
                  aria-current={matched ? "true" : undefined}
                  {...(selectable
                    ? {
                        role: "radio" as const,
                        "aria-checked": selected,
                        tabIndex: 0,
                        onClick: () => onSelectRow?.(row.id),
                        onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelectRow?.(row.id);
                          }
                        },
                      }
                    : {})}
                >
                  {headers.map((_, cellIndex) => {
                    const value = row.cells[cellIndex]?.trim() || "—";
                    const isFirst = cellIndex === 0;
                    return (
                      <td
                        key={`${row.id}-${cellIndex}`}
                        className={[
                          "px-3 py-2.5 align-top text-[color:inherit]",
                          matched && isFirst ? "font-semibold" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {isFirst && matched ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <Badge variant="default">
                              {selected
                                ? "Ausgewählt"
                                : row.matchReason === "Garagen-Vorschlag"
                                  ? "Vorschlag"
                                  : "Dein Fahrzeug"}
                            </Badge>
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

      {table.rows.some((row) => row.isUserVehicleMatch && row.matchReason) ? (
        <p className="mt-2 text-[0.72rem] text-[color:var(--vd-muted)]">
          {
            table.rows.find((row) => row.isUserVehicleMatch)?.matchReason ??
              null
          }
        </p>
      ) : null}
    </section>
  );
}
