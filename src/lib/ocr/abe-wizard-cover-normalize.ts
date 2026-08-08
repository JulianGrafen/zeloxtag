import { normalizeAbeKbaDigits } from "@/lib/validations/abeSchema";
import type { AbeWizardCoverExtraction } from "@/lib/validations/abeWizardSchemas";

const APPROVAL_NUMBER_LABEL =
  /^(?:abe\s*)?(?:(?:rad|teil(?:es)?|bauteil(?:es)?)[-\s]*)?gutachten(?:s)?(?:\s*nr\.?)?$|^genehmigungsnummer$|^gutachtensnummer$|^gutachtennummer$|^gutachten[-\s]?nr\.?$/i;

function cleanApprovalNumber(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, " ");
}

/** Strip common field labels accidentally copied into the value. */
export function stripApprovalNumberLabel(value: string): string {
  const trimmed = value.trim();
  const colonSplit = trimmed.split(/[:：]/);
  if (colonSplit.length >= 2) {
    const label = colonSplit[0]?.trim() ?? "";
    const candidate = colonSplit.slice(1).join(":").trim();
    if (APPROVAL_NUMBER_LABEL.test(label) && candidate) {
      return candidate;
    }
  }
  return trimmed;
}

/**
 * Normalize cover-step extraction:
 * - KBA digits only when present
 * - Genehmigungsnummer from approvalNumber (Gutachten-Nr., Rad-Gutachten-Nr., etc.)
 */
export function normalizeAbeWizardCoverExtraction(
  raw: AbeWizardCoverExtraction,
): AbeWizardCoverExtraction {
  const kbaNumber = normalizeAbeKbaDigits(raw.kbaNumber) || null;
  const approvalNumber = cleanApprovalNumber(
    stripApprovalNumberLabel(raw.approvalNumber ?? ""),
  );

  return {
    ...raw,
    kbaNumber,
    approvalNumber,
    designType: raw.designType
      ? raw.designType.replace(/\s*\n\s*/g, " / ").trim()
      : null,
  };
}
