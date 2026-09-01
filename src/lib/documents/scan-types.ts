/**
 * Explicit scan intents — user picks the document kind before OCR so
 * extraction uses the right schema instead of guessing.
 */

import type { ApprovalFieldKind } from "@/lib/documents/approval-fields";
import type { OcrDocumentType } from "@/lib/ocr/ocr-types";
import type { InvoiceTextParseCategory } from "@/lib/ocr/text-parse-schema";
import type { DocumentType } from "@/types/database";

export const SCAN_TYPES = [
  "invoice",
  "repair",
  "service",
  "abe",
  "vault",
  "gutachten",
  "teilegutachten",
  "einzelabnahme",
  "pruefung192",
  "egbe",
  "tuev",
] as const;

export type ScanType = (typeof SCAN_TYPES)[number];

/** Scan intents Schrauber may use (no ABE / TÜV). */
export const SCHRAUBER_SCAN_TYPES: readonly ScanType[] = [
  "service",
  "invoice",
  "repair",
];

export type ScanTypeDefinition = {
  id: ScanType;
  title: string;
  description: string;
  /** OCR / model routing bucket. */
  ocrDocumentType: OcrDocumentType;
  /** Locked invoice parse category when applicable. */
  category: InvoiceTextParseCategory;
  lockCategory: boolean;
  /** Structured approval subtype for `approval_fields`. */
  approvalKind: ApprovalFieldKind | null;
  /** Stored `documents.type`. */
  documentType: DocumentType;
  heading: string;
  subheading: string;
  successTypeQuery: DocumentType;
};

export const SCAN_TYPE_DEFINITIONS: Record<ScanType, ScanTypeDefinition> = {
  invoice: {
    id: "invoice",
    title: "Rechnung",
    description: "Werkstatt, Teile, Tuning",
    ocrDocumentType: "invoice",
    category: "other",
    lockCategory: false,
    approvalKind: null,
    documentType: "invoice",
    heading: "Rechnung scannen",
    subheading: "Beleg mit Betrag und Positionen",
    successTypeQuery: "invoice",
  },
  repair: {
    id: "repair",
    title: "Reparatur",
    description: "Instandsetzung, Verschleiß, Schaden",
    ocrDocumentType: "invoice",
    category: "repair",
    lockCategory: true,
    approvalKind: null,
    documentType: "invoice",
    heading: "Reparatur scannen",
    subheading: "Werkstattbeleg für eine Reparatur",
    successTypeQuery: "invoice",
  },
  service: {
    id: "service",
    title: "Service",
    description: "Inspektion, Ölwechsel, Wartung",
    ocrDocumentType: "invoice",
    category: "service",
    lockCategory: true,
    approvalKind: null,
    documentType: "invoice",
    heading: "Service scannen",
    subheading: "Inspektion oder Wartungsbeleg",
    successTypeQuery: "invoice",
  },
  abe: {
    id: "abe",
    title: "ABE",
    description: "Allgemeine Betriebserlaubnis, KBA-Nummer",
    ocrDocumentType: "abe",
    category: "abe",
    lockCategory: true,
    approvalKind: "abe",
    documentType: "abe",
    heading: "ABE scannen",
    subheading: "KBA-Nummer · Verwendungsbereich",
    successTypeQuery: "abe",
  },
  vault: {
    id: "vault",
    title: "Gutachten Tresor",
    description: "Teilegutachten, Einzelabnahmen & Sonstiges ablegen",
    ocrDocumentType: "abe",
    category: "abe",
    lockCategory: true,
    approvalKind: "vault",
    documentType: "abe",
    heading: "Gutachten Tresor",
    subheading: "Teilegutachten, Einzelabnahmen & Sonstiges ablegen",
    successTypeQuery: "abe",
  },
  gutachten: {
    id: "gutachten",
    title: "Gutachten / Prüfbericht",
    description: "Teilegutachten, Einzelabnahme §21, Anbauabnahme",
    ocrDocumentType: "abe",
    category: "abe",
    lockCategory: true,
    approvalKind: "gutachten",
    documentType: "abe",
    heading: "Gutachten scannen",
    subheading: "KI erkennt Teilegutachten, §21 oder Anbauabnahme",
    successTypeQuery: "abe",
  },
  teilegutachten: {
    id: "teilegutachten",
    title: "Teilegutachten",
    description: "§ 19 Abs. 3 · Prüforganisation",
    ocrDocumentType: "abe",
    category: "abe",
    lockCategory: true,
    approvalKind: "teilegutachten",
    documentType: "abe",
    heading: "Teilegutachten scannen",
    subheading: "Geführter Scan · 4 Abschnitte",
    successTypeQuery: "abe",
  },
  einzelabnahme: {
    id: "einzelabnahme",
    title: "Einzelabnahme",
    description: "§ 21 · Feld 22",
    ocrDocumentType: "abe",
    category: "abe",
    lockCategory: true,
    approvalKind: "einzelabnahme",
    documentType: "abe",
    heading: "Einzelabnahme scannen",
    subheading: "Änderungsabnahme / Sachverständiger",
    successTypeQuery: "abe",
  },
  pruefung192: {
    id: "pruefung192",
    title: "§19(2) Prüfung",
    description: "Anbauabnahme · TÜV",
    ocrDocumentType: "abe",
    category: "abe",
    lockCategory: true,
    approvalKind: "pruefung192",
    documentType: "abe",
    heading: "§19(2) Prüfung scannen",
    subheading: "Untersuchungsbericht · Gutachten · Vorschriften",
    successTypeQuery: "abe",
  },
  egbe: {
    id: "egbe",
    title: "EG-BE",
    description: "E-Prüfzeichen · ECE",
    ocrDocumentType: "abe",
    category: "abe",
    lockCategory: true,
    approvalKind: "egbe",
    documentType: "abe",
    heading: "EG-BE scannen",
    subheading: "EG-/ECE-Typgenehmigung",
    successTypeQuery: "abe",
  },
  tuev: {
    id: "tuev",
    title: "TÜV / HU",
    description: "Haupt- & Abgasuntersuchung",
    ocrDocumentType: "tuev",
    category: "tuev",
    lockCategory: true,
    approvalKind: "tuev",
    documentType: "tuev",
    heading: "TÜV-Bericht scannen",
    subheading: "HU/AU Prüfbericht mit Ergebnis",
    successTypeQuery: "tuev",
  },
};

/** Ordered for the upload/scan picker UI (excludes legacy-only types like egbe). */
export const SCAN_TYPE_OPTIONS: ScanTypeDefinition[] = [
  SCAN_TYPE_DEFINITIONS.invoice,
  SCAN_TYPE_DEFINITIONS.service,
  SCAN_TYPE_DEFINITIONS.vault,
  SCAN_TYPE_DEFINITIONS.abe,
  SCAN_TYPE_DEFINITIONS.tuev,
];

/** Legacy scan intents map to the unified Gutachten flow. */
const LEGACY_GUTACHTEN_SCAN_TYPES = new Set<ScanType>([
  "teilegutachten",
  "einzelabnahme",
  "pruefung192",
]);

export function normalizeScanType(type: ScanType): ScanType {
  if (LEGACY_GUTACHTEN_SCAN_TYPES.has(type)) return "gutachten";
  return type;
}

export function parseScanType(value: string | null | undefined): ScanType | null {
  if (!value) return null;
  if (!(SCAN_TYPES as readonly string[]).includes(value)) return null;
  return normalizeScanType(value as ScanType);
}

export function scanTypeOptionsForRole(
  role: "owner" | "contributor",
): ScanTypeDefinition[] {
  if (role === "owner") return SCAN_TYPE_OPTIONS;
  return SCHRAUBER_SCAN_TYPES.map((id) => SCAN_TYPE_DEFINITIONS[id]);
}

export function scanTypeDefinition(type: ScanType): ScanTypeDefinition {
  return SCAN_TYPE_DEFINITIONS[normalizeScanType(type)];
}

export function isInvoiceFamilyScanType(type: ScanType): boolean {
  return scanTypeDefinition(type).ocrDocumentType === "invoice";
}
