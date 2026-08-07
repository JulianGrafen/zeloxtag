import { TuevDefectsTable } from "@/components/documents/tuev-defects-table";
import type { TuevReport } from "@/lib/validations/documentSchemas";

type TuevDefectsSectionProps = {
  data: Pick<TuevReport, "defectsTable" | "defectsList">;
  /** When false, renders content only (no outer section card). */
  asSection?: boolean;
  emptyHint?: string;
};

/**
 * Festgestellte Mängel — structured table or plain list fallback.
 */
export function TuevDefectsSection({
  data,
  asSection = true,
  emptyHint = "Keine Mängel erkannt. Original-PDF unten öffnen.",
}: TuevDefectsSectionProps) {
  const defectsTable = data.defectsTable?.length ? data.defectsTable : null;
  const defectsList =
    !defectsTable && data.defectsList?.length ? data.defectsList : null;

  const content = defectsTable ? (
    <TuevDefectsTable defects={defectsTable} />
  ) : defectsList ? (
    <ol className="space-y-2">
      {defectsList.map((defect, index) => (
        <li
          key={`${index}-${defect.slice(0, 32)}`}
          className="flex gap-3 rounded-xl bg-[color:var(--vd-surface-elevated)] p-3 text-[0.88rem]"
        >
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[0.7rem] font-semibold text-white">
            {index + 1}
          </span>
          <span className="pt-0.5 leading-relaxed text-[color:var(--vd-text)]">
            {defect}
          </span>
        </li>
      ))}
    </ol>
  ) : (
    <p className="text-[0.88rem] text-[color:var(--vd-muted)]">{emptyHint}</p>
  );

  if (!asSection) {
    return content;
  }

  return (
    <section className="rounded-[1.35rem] border border-[color:var(--vd-border)] bg-[color:var(--vd-surface)] p-4 shadow-[var(--vd-shadow-sm)] sm:p-5">
      <h2 className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--vd-muted)]">
        Festgestellte Mängel
      </h2>
      {content}
    </section>
  );
}
