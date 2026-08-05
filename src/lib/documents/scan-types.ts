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
  "teilegutachten",
  "einzelabnahme",
  "egbe",
  "tuev",
] as const;

export type ScanType = (typeof SCAN_TYPES)[number];

/** Scan intents Schrauber may use (no ABE / TÜV). */
export const SCHRAUBER_SCAN_TYPES: readonly ScanType[] = [
  "repair",
  "service",
  "invoice",
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
    description: "Allgemeine Betriebserlaubnis",
    ocrDocumentType: "abe",
    category: "abe",
    lockCategory: true,
    approvalKind: "abe",
    documentType: "abe",
    heading: "ABE scannen",
    subheading: "Ein Bauteil · alle Seiten",
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
    subheading: "Verwendungsbereich & Abnahmeauflagen",
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

/** Ordered for the picker UI. */
export const SCAN_TYPE_OPTIONS: ScanTypeDefinition[] = [
  SCAN_TYPE_DEFINITIONS.invoice,
  SCAN_TYPE_DEFINITIONS.repair,
  SCAN_TYPE_DEFINITIONS.service,
  SCAN_TYPE_DEFINITIONS.abe,
  SCAN_TYPE_DEFINITIONS.teilegutachten,
  SCAN_TYPE_DEFINITIONS.einzelabnahme,
  SCAN_TYPE_DEFINITIONS.egbe,
  SCAN_TYPE_DEFINITIONS.tuev,
];

export function scanTypeOptionsForRole(
  role: "owner" | "contributor",
): ScanTypeDefinition[] {
  if (role === "owner") return SCAN_TYPE_OPTIONS;
  return SCHRAUBER_SCAN_TYPES.map((id) => SCAN_TYPE_DEFINITIONS[id]);
}

export function parseScanType(value: string | null | undefined): ScanType | null {
  if (!value) return null;
  return (SCAN_TYPES as readonly string[]).includes(value)
    ? (value as ScanType)
    : null;
}

export function scanTypeDefinition(type: ScanType): ScanTypeDefinition {
  return SCAN_TYPE_DEFINITIONS[type];
}
