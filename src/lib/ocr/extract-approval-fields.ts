/**
 * Heuristic subtype extraction → DocumentServiceFactory validation.
 * Produces `documents.approval_fields` without a second LLM round-trip.
 */

import {
  type ApprovalFieldKind,
  type ApprovalFields,
} from "@/lib/documents/approval-fields";
import {
  EGBEService,
  EinzelabnahmeService,
  isDocumentValidationError,
  TeilegutachtenService,
  TuevReportService,
} from "@/services/documents";
import type { TestingOrganization } from "@/lib/validations/documentSchemas";

import { detectApprovalKind } from "./detect-approval-kind";
import {
  extractTuevDefectsFromText,
  defectsListFromTuevDefectRows,
} from "./tuev-defects-from-text";
import { extractTuevNextInspectionFromText } from "./tuev-next-inspection-from-text";

function detectOrganization(text: string): TestingOrganization {
  const folded = text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (/\bdekra\b/.test(folded)) return "DEKRA";
  if (/\bgtue\b|\bgtu\b/.test(folded)) return "GTÜ";
  if (/\bkues\b|\bkus\b/.test(folded)) return "KÜS";
  if (/\btuv\b|\btuev\b/.test(folded)) return "TÜV";
  return "other";
}

function labeledValue(text: string, labels: RegExp): string | null {
  const match = text.match(labels);
  if (!match?.[1]) return null;
  const value = match[1].replace(/\s+/g, " ").trim();
  return value.length > 0 ? value.slice(0, 2_000) : null;
}

function extractTeilegutachtenCandidate(text: string): unknown {
  const documentNumber =
    labeledValue(
      text,
      /(?:Gutachten[-\s]?Nr\.?|Dokument[-\s]?Nr\.?|Nr\.?)\s*[:\s]\s*([A-Z0-9][A-Z0-9/.\-]{3,80})/i,
    ) ??
    labeledValue(text, /\b(?:TG|ABE)[-\s]?([A-Z0-9/.\-]{4,40})\b/i);

  const validityArea =
    labeledValue(
      text,
      /Verwendungsbereich\s*[:\n]\s*([\s\S]{20,1800}?)(?:\n\s*(?:Auflage|Hinweise|Bedingungen|Seite)\b|$)/i,
    ) ??
    (/\bverwendungsbereich\b/i.test(text)
      ? "Siehe Verwendungsbereich im Dokument"
      : null);

  const immediate =
    /\bsofortige\s+abnahme\b|\babnahme\s+(?:durch|bei)\s+(?:tüv|tuev|dekra|prüfstelle)/i.test(
      text,
    ) || /\b§\s*19\s*abs\.?\s*3\b/i.test(text);

  return {
    testingOrganization: detectOrganization(text),
    documentNumber: documentNumber ?? "unbekannt",
    validityArea: validityArea ?? "Verwendungsbereich siehe Originaldokument",
    immediateInspectionRequired: immediate,
  };
}

function extractEinzelabnahmeCandidate(text: string): unknown {
  const officialExpert =
    labeledValue(
      text,
      /(?:Sachverständiger|Prüfingenieur|AA[SŚ])\s*[:\s]\s*([A-ZÄÖÜ][\wÄÖÜäöüß.\- ]{2,120})/i,
    ) ?? "Sachverständiger siehe Dokument";

  const reportNumber =
    labeledValue(
      text,
      /(?:Bericht[-\s]?Nr\.?|Gutachten[-\s]?Nr\.?|Nr\.?)\s*[:\s]\s*([A-Z0-9][A-Z0-9/.\-]{3,80})/i,
    ) ?? "unbekannt";

  const field22Text =
    labeledValue(
      text,
      /(?:Feld\s*22|Ziffer\s*22|Änderungen)\s*[:\n]\s*([\s\S]{10,3500}?)(?:\n\s*(?:Seite|Unterschrift|Datum)\b|$)/i,
    ) ??
    (/\beinzelabnahme\b|\bänderungsabnahme\b/i.test(text)
      ? "Änderungen siehe Originaldokument (Feld 22)"
      : null);

  return {
    officialExpert: officialExpert.slice(0, 200),
    reportNumber: reportNumber.slice(0, 120),
    field22Text: (field22Text ?? "Feld 22 siehe Originaldokument").slice(
      0,
      4_000,
    ),
  };
}

function extractEgbeCandidate(text: string): unknown {
  const eMarkMatch =
    text.match(/\b(e\d+\s*\*[^\s,]{0,80})/i) ??
    text.match(/\b(e\d+[A-Z0-9*]{2,60})/i);
  const eMark = eMarkMatch?.[1]?.replace(/\s+/g, "").slice(0, 160) ?? null;

  const componentGroup =
    labeledValue(
      text,
      /(?:Bauteilgruppe|Geräteart|Genehmigungsgegenstand)\s*[:\s]\s*([^\n]{2,120})/i,
    ) ?? "Bauteilgruppe siehe Dokument";

  return {
    eMark: eMark ?? "e1*",
    componentGroup: componentGroup.slice(0, 120),
  };
}

function extractTuevCandidate(text: string): unknown {
  const testDateMatch = text.match(
    /(?:Untersuchungs(?:tag|datum)|geprüft am|Datum)\s*[:\s]\s*(\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2})/i,
  );
  const nextInspectionDate = extractTuevNextInspectionFromText(text);
  const mileageMatch = text.match(
    /(?:km[-\s]?stand|kilometerstand|odometer)\s*[:\s]\s*([\d.\s]{3,12})\s*km?/i,
  );
  const documentNumber = labeledValue(
    text,
    /(?:Vorgangs?[-\s]?Nr\.?|Bericht[-\s]?Nr\.?|Nr\.?)\s*[:\s]\s*([A-Z0-9][A-Z0-9/.\-]{3,80})/i,
  );

  let result = "no_defects";
  if (/\bnicht\s+bestanden\b|\bdurchgefallen\b/i.test(text)) {
    result = "failed";
  } else if (/\bgefährliche\s+mängel\b/i.test(text)) {
    result = "dangerous_defects";
  } else if (/\berhebliche\s+mängel\b/i.test(text) && !/\bohne\s+erhebliche/i.test(text)) {
    result = "major_defects";
  } else if (/\bgering(?:fügig)?e?\s+mängel\b/i.test(text)) {
    result = "minor_defects";
  } else if (/\bohne\s+(?:erhebliche\s+)?mängel\b|\bmangelfrei\b/i.test(text)) {
    result = "no_defects";
  }

  const defectsTable = extractTuevDefectsFromText(text);
  const defectsList = defectsListFromTuevDefectRows(defectsTable);

  return {
    testingOrganization: detectOrganization(text),
    testDate: testDateMatch?.[1] ?? null,
    result,
    mileageKm: mileageMatch?.[1] ?? null,
    nextInspectionDate,
    documentNumber,
    defectsTable,
    defectsList,
  };
}

function candidateForKind(kind: ApprovalFieldKind, text: string): unknown {
  switch (kind) {
    case "teilegutachten":
      return extractTeilegutachtenCandidate(text);
    case "einzelabnahme":
      return extractEinzelabnahmeCandidate(text);
    case "egbe":
      return extractEgbeCandidate(text);
    case "tuev":
      return extractTuevCandidate(text);
    case "abe":
      return null;
  }
}

/**
 * Detect kind and validate subtype payload.
 * Returns `{ kind: "abe" }` when no subtype data can be validated.
 */
export function extractApprovalFieldsFromText(
  text: string,
  preferredKind?: ApprovalFieldKind,
): ApprovalFields {
  const kind = preferredKind ?? detectApprovalKind(text);

  if (kind === "abe") {
    return { kind: "abe" };
  }

  const candidate = candidateForKind(kind, text);
  if (!candidate) {
    return { kind: "abe" };
  }

  try {
    if (kind === "teilegutachten") {
      return {
        kind,
        data: new TeilegutachtenService().parseAndValidate(candidate),
      };
    }
    if (kind === "einzelabnahme") {
      return {
        kind,
        data: new EinzelabnahmeService().parseAndValidate(candidate),
      };
    }
    if (kind === "egbe") {
      return {
        kind,
        data: new EGBEService().parseAndValidate(candidate),
      };
    }
    return {
      kind: "tuev",
      data: new TuevReportService().parseAndValidate(candidate),
    };
  } catch (error) {
    if (isDocumentValidationError(error)) {
      // Do not log OCR field values / PII — type + issue paths only.
      console.error(
        "[extractApprovalFieldsFromText] validation failed",
        error.documentType,
        error.issues.map((issue) => issue.path).join(","),
      );
    }
    // Soft fallback: keep classic ABE columns; subtype data omitted.
    return { kind: "abe" };
  }
}
