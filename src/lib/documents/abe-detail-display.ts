import type { DocumentTechnicalSpec } from "@/types/database";

const VERKAUFSBEZEICHNUNG_LABEL = /^verkaufsbezeichnung\b/i;
const AUFLAGEN_NOTES_SPEC_LABEL = /^auflagen\s*\(text\)/i;

export const ABE_AUFLAGEN_NOTES_SPEC_LABEL = "Auflagen (Text)";

export function isAuflagenNotesSpecLabel(label: string): boolean {
  return AUFLAGEN_NOTES_SPEC_LABEL.test(label.trim());
}

export function auflagenNotesFromTechnicalSpecs(
  specs: DocumentTechnicalSpec[],
): string | null {
  const match = specs.find((spec) => isAuflagenNotesSpecLabel(spec.label));
  return match?.value.trim() || null;
}

/** User-facing label for ABE `verkaufsbezeichnung` in document views. */
export const ABE_VEHICLE_MODEL_DISPLAY_LABEL = "Fahrzeugmodell";

export function isVerkaufsbezeichnungSpecLabel(label: string): boolean {
  return VERKAUFSBEZEICHNUNG_LABEL.test(label.trim());
}

export function displayLabelForAbeSpecLabel(label: string): string {
  return isVerkaufsbezeichnungSpecLabel(label)
    ? ABE_VEHICLE_MODEL_DISPLAY_LABEL
    : label;
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

/** Technical specs for the ABE detail view (relabeled for display). */
export function technicalSpecsForAbeDetailView(
  specs: DocumentTechnicalSpec[],
  options?: { vehicleModel?: string | null },
): DocumentTechnicalSpec[] {
  const mapped = specs
    .filter(
      (spec) =>
        spec.label !== "ABE-Nummer" && !isAuflagenNotesSpecLabel(spec.label),
    )
    .map((spec) => ({
      ...spec,
      label: displayLabelForAbeSpecLabel(spec.label),
    }));

  const hasModel = mapped.some(
    (spec) => spec.label === ABE_VEHICLE_MODEL_DISPLAY_LABEL,
  );
  const modelValue =
    options?.vehicleModel?.trim() ||
    specs.find((spec) => isVerkaufsbezeichnungSpecLabel(spec.label))?.value.trim();

  if (!hasModel && modelValue) {
    mapped.push({
      label: ABE_VEHICLE_MODEL_DISPLAY_LABEL,
      value: modelValue,
    });
  }

  return mapped;
}

/** Vehicle approval lines without the duplicate Fahrzeugmodell header line. */
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

export function displaySpecForAbeDetailView(
  spec: DocumentTechnicalSpec,
): DocumentTechnicalSpec {
  return {
    ...spec,
    label: displayLabelForAbeSpecLabel(spec.label),
  };
}
