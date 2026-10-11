import { z } from "zod";

export const RECEIPT_KINDS = [
  "fuel_receipt",
  "workshop_invoice",
  "uncertain",
] as const;

export type ReceiptKind = (typeof RECEIPT_KINDS)[number];

export const receiptKindSchema = z.object({
  kind: z.enum(RECEIPT_KINDS),
  confidence: z.number().min(0).max(1).optional(),
});

export type ReceiptKindResult = z.infer<typeof receiptKindSchema>;

const FUEL_SIGNALS = [
  /\btankstelle\b/i,
  /\b(tankquittung|tankbeleg|kraftstoff)\b/i,
  /\b(shell|aral|esso|total energies|jet|avia|hem|star|agip|omv|bp)\b/i,
  /€\s*\/?\s*l\b/i,
  /\b(eur|€)\s*\/\s*l\b/i,
  /\bliterpreis\b/i,
  /\b(diesel|super\s*e\d+|e10|e5|benzin|kraftstoff)\b/i,
  /\b\d+[,.]?\d*\s*(l|ltr|liter)\b/i,
  /\bzapf/i,
];

const WORKSHOP_SIGNALS = [
  /\b(rechnung|invoice|werkstatt|autohaus|kfz)\b/i,
  /\b(netto|brutto|mwst|umsatzsteuer|ust\.?)\b/i,
  /\b(arbeitszeit|arbeitswert|teil(e)?nummer)\b/i,
  /\b(reparatur|inspektion|wartung|ölwechsel)\b/i,
  /\babnr\.?|abe[\s-]?nr/i,
  /\bposition(en)?\b/i,
  /\brechnungsnr/i,
];

/** Offline scoring from OCR text snippets (tests + LLM fallback). */
export function inferReceiptKindFromText(text: string): ReceiptKindResult {
  const sample = text.trim().slice(0, 8_000);
  if (sample.length < 8) {
    return { kind: "uncertain", confidence: 0 };
  }

  let fuelScore = 0;
  let workshopScore = 0;

  for (const pattern of FUEL_SIGNALS) {
    if (pattern.test(sample)) fuelScore += 1;
  }
  for (const pattern of WORKSHOP_SIGNALS) {
    if (pattern.test(sample)) workshopScore += 1;
  }

  if (fuelScore >= 2 && fuelScore > workshopScore) {
    return {
      kind: "fuel_receipt",
      confidence: Math.min(0.95, 0.5 + fuelScore * 0.1),
    };
  }
  if (workshopScore >= 2 && workshopScore > fuelScore) {
    return {
      kind: "workshop_invoice",
      confidence: Math.min(0.95, 0.5 + workshopScore * 0.1),
    };
  }
  if (fuelScore === 1 && workshopScore === 0) {
    return { kind: "fuel_receipt", confidence: 0.45 };
  }
  if (workshopScore === 1 && fuelScore === 0) {
    return { kind: "workshop_invoice", confidence: 0.45 };
  }

  return { kind: "uncertain", confidence: 0.2 };
}

export function normalizeReceiptKindResult(
  raw: ReceiptKindResult | null | undefined,
): ReceiptKindResult {
  const parsed = receiptKindSchema.safeParse(raw);
  if (!parsed.success) {
    return { kind: "uncertain", confidence: 0 };
  }
  if (parsed.data.kind === "uncertain") {
    return parsed.data;
  }
  const confidence = parsed.data.confidence ?? 0.7;
  if (confidence < 0.35) {
    return { kind: "uncertain", confidence };
  }
  return parsed.data;
}

/** PDF uploads are treated as workshop invoices in the auto-router. */
export function receiptKindForUploadMime(
  mime: string,
  classified: ReceiptKind,
): ReceiptKind {
  if (mime === "application/pdf") {
    return "workshop_invoice";
  }
  return classified;
}
