import type { TuevDefectRow } from "@/lib/validations/documentSchemas";

const SEVERITY_LABELS: Record<string, string> = {
  EM: "Erheblich",
  GM: "Geringfügig",
};

type TuevDefectsTableProps = {
  defects: TuevDefectRow[];
  className?: string;
};

/**
 * Structured HU/AU Mängel — Prüfpunkt, Beschreibung, Art (EM/GM).
 */
export function TuevDefectsTable({
  defects,
  className = "",
}: TuevDefectsTableProps) {
  if (!defects.length) return null;

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
        <caption className="sr-only">Festgestellte Mängel</caption>
        <thead>
          <tr className="border-b border-[color:var(--vd-border)] bg-[color:var(--vd-surface-elevated)]">
            <th
              scope="col"
              className="w-[6.5rem] px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]"
            >
              Prüfpunkt
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]"
            >
              Mangel
            </th>
            <th
              scope="col"
              className="w-[5.5rem] px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--vd-muted)]"
            >
              Art
            </th>
          </tr>
        </thead>
        <tbody>
          {defects.map((defect, index) => (
            <tr
              key={`${index}-${defect.checkpoint ?? "na"}-${defect.description.slice(0, 24)}`}
              className="border-b border-[color:var(--vd-border)] last:border-b-0 bg-[color:var(--vd-surface)]"
            >
              <td className="px-3 py-2.5 align-top font-mono text-[0.78rem] text-[color:var(--vd-text)]">
                {defect.checkpoint ?? "—"}
              </td>
              <td className="px-3 py-2.5 align-top leading-relaxed text-[color:var(--vd-text)]">
                {defect.description}
              </td>
              <td className="px-3 py-2.5 align-top text-[0.78rem] font-medium text-[color:var(--vd-muted)]">
                {defect.severity ? (
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-0.5",
                      defect.severity === "EM"
                        ? "bg-amber-500/12 text-amber-900"
                        : "bg-neutral-900/6 text-[color:var(--vd-text)]",
                    ].join(" ")}
                  >
                    {defect.severity}{" "}
                    <span className="sr-only">
                      {SEVERITY_LABELS[defect.severity]}
                    </span>
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
