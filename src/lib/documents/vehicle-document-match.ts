const VIN_RE = /\b([A-HJ-NPR-Z0-9]{17})\b/gi;

function normalizeVin(vin: string): string {
  return vin.replace(/\s+/g, "").toUpperCase();
}

function extractVin(rawText: string): string | null {
  const matches = [...rawText.matchAll(VIN_RE)].map((m) => normalizeVin(m[1]!));
  return matches[0] ?? null;
}

function tokenizeModel(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export type VehicleDocumentMatch = {
  extractedVin: string | null;
  mismatch: boolean;
  reason: string | null;
};

/**
 * Compare OCR text against the tagged vehicle — block silent auto-save on clear conflicts.
 */
export function assessVehicleDocumentMatch(input: {
  rawText: string;
  garageVin: string | null | undefined;
  garageMake: string | null | undefined;
  garageModel: string | null | undefined;
}): VehicleDocumentMatch {
  const extractedVin = extractVin(input.rawText);
  const garageVin = input.garageVin?.trim()
    ? normalizeVin(input.garageVin.trim())
    : null;

  if (extractedVin && garageVin && extractedVin !== garageVin) {
    return {
      extractedVin,
      mismatch: true,
      reason: `FIN auf dem Beleg (${extractedVin}) passt nicht zum Fahrzeug (${garageVin}).`,
    };
  }

  const garageModel = input.garageModel?.trim() ?? "";
  const garageMake = input.garageMake?.trim() ?? "";
  if (garageModel.length >= 2) {
    const blob = input.rawText.toLowerCase();
    const modelTokens = tokenizeModel(garageModel);
    const conflicting = findConflictingModelToken(blob, modelTokens, garageMake);
    if (conflicting) {
      return {
        extractedVin,
        mismatch: true,
        reason: `Modell auf dem Beleg („${conflicting}“) passt nicht zu ${garageMake} ${garageModel}.`,
      };
    }
  }

  return { extractedVin, mismatch: false, reason: null };
}

/** e.g. 530d garage but invoice says 330i E90 */
function findConflictingModelToken(
  blob: string,
  garageTokens: string[],
  garageMake: string,
): string | null {
  const makeLower = garageMake.toLowerCase();
  const knownConflicts = [
    /\b330i\b|\b320i\b|\b335i\b|\b328i\b|\b525d\b|\b530d\b|\b535d\b|\b520d\b|\be90\b|\be91\b|\bf30\b|\bg30\b|\be36\b|\be46\b|\be39\b|\be60\b|\be92\b|\bm3\b|\bm5\b|\bsupra\b|\brx-?8\b|\bgolf\b|\bgti\b|\br32\b|\br33\b|\br34\b|\ba4\b|\ba6\b|\brs4\b|\brs6\b/,
  ];
  for (const pattern of knownConflicts) {
    const match = blob.match(pattern);
    if (!match) continue;
    const token = match[0]!.toLowerCase();
    const garageHas = garageTokens.some(
      (t) => token.includes(t) || t.includes(token),
    );
    if (!garageHas && (!makeLower || blob.includes(makeLower))) {
      return match[0]!;
    }
  }
  return null;
}
