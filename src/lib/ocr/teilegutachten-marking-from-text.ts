import type { TableData } from "@/lib/validations/abeSchema";

export const TEILEGUTACHTEN_MARKING_TYPE_MAX = 200;
export const TEILEGUTACHTEN_MARKING_NUMBER_MAX = 120;

export type TeilegutachtenMarkingExtract = {
  markingType: string | null;
  markingNumber: string | null;
};

const MARKING_SECTION_HEADING =
  /(?:^|\n)\s*(?:Kennzeichnung|Kennzeichnung\s+am\s+Bauteil)\b[^\n]*/i;

const MARKING_SECTION_END =
  /\n\s*(?:Unterschrift|Genehmigungszeichen|Anhang|Gutachten(?:nummer|-nr)?|Prüforganisation|(?:---+)?\s*Seite\s+\d)/i;

const ART_INLINE =
  /Art\s+der\s+Kennzeichnung\s*[:\-|]\s*([^\n|]+)/i;

const NUMMER_INLINE =
  /(?:Kennzeichnungs(?:nummer|nr\.?)|Nummer\s+der\s+Kennzeichnung|(?<![A-Za-z0-9])Nummer)\s*[:\-|]\s*([^\n|]+)/i;

const ART_PIPE =
  /\|\s*Art\s+der\s+Kennzeichnung\s*\|\s*([^|\n]+?)\s*\|/i;

const NUMMER_PIPE =
  /\|\s*(?:Kennzeichnungs(?:nummer|nr\.?)|Nummer\s+der\s+Kennzeichnung|Nummer)\s*\|\s*([^|\n]+?)\s*\|/i;

const KNOWN_MARKING_TYPES =
  /^(?:Aufdruck|Eingegossen|Typenschild|Prüfplakette|Gravur|Etikett|Siegel|Stempel|Aufkleber|Lasermarkierung|Nietplakette)\b/i;

function normalizeMarkingType(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-•*]\s*/, "")
    .replace(/\.$/, "")
    .slice(0, TEILEGUTACHTEN_MARKING_TYPE_MAX);

  if (trimmed.length < 2) return null;
  if (/^art\s+der\s+kennzeichnung\b/i.test(trimmed)) return null;
  if (/^(?:nummer|kennzeichnungsnummer)\b/i.test(trimmed)) return null;
  return trimmed;
}

function normalizeMarkingNumber(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-•*]\s*/, "")
    .replace(/\.$/, "")
    .slice(0, TEILEGUTACHTEN_MARKING_NUMBER_MAX);

  if (trimmed.length < 1) return null;
  if (/^(?:nummer|kennzeichnungsnummer)\b/i.test(trimmed)) return null;
  return trimmed;
}

function sliceMarkingSection(rawText: string): string | null {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) return null;

  const headingMatch = text.match(MARKING_SECTION_HEADING);
  if (headingMatch?.index === undefined) return null;

  const tail = text.slice(headingMatch.index + headingMatch[0].length);
  const endAt = tail.search(MARKING_SECTION_END);
  return (endAt >= 0 ? tail.slice(0, endAt) : tail.slice(0, 1_200)).trim();
}

function parseMarkingFromSection(section: string): TeilegutachtenMarkingExtract {
  const artInline = section.match(ART_INLINE)?.[1];
  const numInline = section.match(NUMMER_INLINE)?.[1];

  if (artInline || numInline) {
    return {
      markingType: normalizeMarkingType(artInline),
      markingNumber: normalizeMarkingNumber(numInline),
    };
  }

  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let markingType: string | null = null;
  let markingNumber: string | null = null;

  for (const line of lines) {
    const artMatch = line.match(
      /^Art\s+der\s+Kennzeichnung\s*[:\-|]?\s*(.+)$/i,
    );
    if (artMatch?.[1]) {
      markingType = normalizeMarkingType(artMatch[1]);
      continue;
    }

    const numMatch = line.match(
      /^(?:Kennzeichnungs(?:nummer|nr\.?)|Nummer\s+der\s+Kennzeichnung|Nummer)\s*[:\-|]?\s*(.+)$/i,
    );
    if (numMatch?.[1]) {
      markingNumber = normalizeMarkingNumber(numMatch[1]);
      continue;
    }

    if (!markingType && !markingNumber && line.length >= 2) {
      if (KNOWN_MARKING_TYPES.test(line)) {
        markingType = normalizeMarkingType(line);
      }
    }
  }

  if (!markingType && lines.length === 1) {
    markingType = normalizeMarkingType(lines[0]);
  }

  return { markingType, markingNumber };
}

/** Combined Kennzeichnung label for notes / validityArea. */
export function formatTeilegutachtenPhysicalMarking(
  markingType: string | null | undefined,
  markingNumber: string | null | undefined,
): string | null {
  const type = markingType?.trim() || null;
  const number = markingNumber?.trim() || null;

  if (type && number) {
    return `Art: ${type} · Nummer: ${number}`.slice(0, 500);
  }
  if (type) return type.slice(0, 500);
  if (number) return `Nummer: ${number}`.slice(0, 500);
  return null;
}

export function normalizeTeilegutachtenMarking(input: {
  markingType?: string | null;
  markingNumber?: string | null;
  physicalMarking?: string | null;
}): TeilegutachtenMarkingExtract & { physicalMarking: string | null } {
  let markingType = normalizeMarkingType(input.markingType);
  let markingNumber = normalizeMarkingNumber(input.markingNumber);

  const legacy = input.physicalMarking?.trim();
  if (legacy) {
    const fromLegacy = parseLegacyPhysicalMarking(legacy);
    markingType = markingType ?? fromLegacy.markingType;
    markingNumber = markingNumber ?? fromLegacy.markingNumber;
  }

  const physicalMarking = formatTeilegutachtenPhysicalMarking(
    markingType,
    markingNumber,
  );

  return { markingType, markingNumber, physicalMarking };
}

function parseLegacyPhysicalMarking(
  value: string,
): TeilegutachtenMarkingExtract {
  const artMatch = value.match(/Art\s*[:\-]\s*(.+?)(?:\s·\s|\sNummer\s*[:\-]|$)/i);
  const numMatch = value.match(
    /(?:Nummer|Kennzeichnungs(?:nummer|nr\.?))\s*[:\-]\s*(.+)$/i,
  );

  if (artMatch || numMatch) {
    return {
      markingType: normalizeMarkingType(artMatch?.[1]),
      markingNumber: normalizeMarkingNumber(numMatch?.[1]),
    };
  }

  return { markingType: normalizeMarkingType(value), markingNumber: null };
}

/** Parse Kennzeichnung section from full OCR text. */
export function extractTeilegutachtenMarkingFromText(
  rawText: string,
): TeilegutachtenMarkingExtract {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (text.length < 8) {
    return { markingType: null, markingNumber: null };
  }

  const artPipe = text.match(ART_PIPE)?.[1];
  const numPipe = text.match(NUMMER_PIPE)?.[1];
  if (artPipe || numPipe) {
    return {
      markingType: normalizeMarkingType(artPipe),
      markingNumber: normalizeMarkingNumber(numPipe),
    };
  }

  const artGlobal = text.match(ART_INLINE)?.[1];
  const numGlobal = text.match(NUMMER_INLINE)?.[1];
  if (artGlobal || numGlobal) {
    return {
      markingType: normalizeMarkingType(artGlobal),
      markingNumber: normalizeMarkingNumber(numGlobal),
    };
  }

  const section = sliceMarkingSection(text);
  if (section) {
    return parseMarkingFromSection(section);
  }

  return { markingType: null, markingNumber: null };
}

function labelLooksLikeMarkingType(label: string): boolean {
  return /art\s+der\s+kennzeichnung|kennzeichnung\s+am\s+bauteil|^kennzeichnung$/i.test(
    label,
  );
}

function labelLooksLikeMarkingNumber(label: string): boolean {
  return /kennzeichnungs(?:nummer|nr)|nummer\s+der\s+kennzeichnung|^nummer$/i.test(
    label,
  );
}

/** Read Art / Nummer rows from Technische Daten tables. */
export function extractMarkingFromTechnicalTable(
  table: TableData | null | undefined,
): TeilegutachtenMarkingExtract {
  if (!table?.rows.length) {
    return { markingType: null, markingNumber: null };
  }

  let markingType: string | null = null;
  let markingNumber: string | null = null;

  for (const row of table.rows) {
    const cells = row.cells.map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 2) continue;

    const label = cells[0] ?? "";
    const value = cells.slice(1).join(" · ");

    if (labelLooksLikeMarkingType(label)) {
      markingType = normalizeMarkingType(value) ?? markingType;
    } else if (labelLooksLikeMarkingNumber(label)) {
      markingNumber = normalizeMarkingNumber(value) ?? markingNumber;
    }
  }

  return { markingType, markingNumber };
}

export function mergeTeilegutachtenMarking(
  primary: TeilegutachtenMarkingExtract | null | undefined,
  fallback: TeilegutachtenMarkingExtract | null | undefined,
): TeilegutachtenMarkingExtract {
  return {
    markingType:
      normalizeMarkingType(primary?.markingType) ??
      normalizeMarkingType(fallback?.markingType),
    markingNumber:
      normalizeMarkingNumber(primary?.markingNumber) ??
      normalizeMarkingNumber(fallback?.markingNumber),
  };
}

/** Merge LLM, legacy physicalMarking, OCR text, and Technische Daten rows. */
export function resolveTeilegutachtenMarking(input: {
  markingType?: string | null;
  markingNumber?: string | null;
  physicalMarking?: string | null;
  ocrText?: string | null;
  technicalDataTable?: TableData | null;
}): TeilegutachtenMarkingExtract & { physicalMarking: string | null } {
  const fromText = input.ocrText
    ? extractTeilegutachtenMarkingFromText(input.ocrText)
    : { markingType: null, markingNumber: null };
  const fromTable = extractMarkingFromTechnicalTable(input.technicalDataTable);

  const merged = mergeTeilegutachtenMarking(
    {
      markingType: input.markingType ?? null,
      markingNumber: input.markingNumber ?? null,
    },
    mergeTeilegutachtenMarking(fromText, fromTable),
  );

  return normalizeTeilegutachtenMarking({
    ...merged,
    physicalMarking: input.physicalMarking,
  });
}
