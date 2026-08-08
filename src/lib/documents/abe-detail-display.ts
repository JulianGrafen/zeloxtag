import type { DocumentTechnicalSpec } from "@/types/database";

const VERKAUFSBEZEICHNUNG_LABEL = /^verkaufsbezeichnung\b/i;

export function isVerkaufsbezeichnungSpecLabel(label: string): boolean {
  return VERKAUFSBEZEICHNUNG_LABEL.test(label.trim());
}

/** Technical specs shown in the ABE detail view (excludes duplicate header fields). */
export function technicalSpecsForAbeDetailView(
  specs: DocumentTechnicalSpec[],
): DocumentTechnicalSpec[] {
  return specs.filter(
    (spec) =>
      spec.label !== "ABE-Nummer" && !isVerkaufsbezeichnungSpecLabel(spec.label),
  );
}

function verkaufsbezeichnungValuesToHide(
  technicalSpecs: DocumentTechnicalSpec[],
  verkaufsbezeichnung?: string | null,
): Set<string> {
  const hidden = new Set<string>();
  const fromApproval = verkaufsbezeichnung?.trim();
  if (fromApproval) hidden.add(fromApproval);

  for (const spec of technicalSpecs) {
    if (!isVerkaufsbezeichnungSpecLabel(spec.label)) continue;
    const value = spec.value.trim();
    if (value) hidden.add(value);
  }

  return hidden;
}

/** Vehicle approval lines without the Verkaufsbezeichnung section header. */
export function vehicleApprovalsForAbeDetailView(
  approvals: string[],
  options: {
    technicalSpecs: DocumentTechnicalSpec[];
    verkaufsbezeichnung?: string | null;
  },
): string[] {
  const hidden = verkaufsbezeichnungValuesToHide(
    options.technicalSpecs,
    options.verkaufsbezeichnung,
  );
  return approvals.filter((item) => !hidden.has(item.trim()));
}
