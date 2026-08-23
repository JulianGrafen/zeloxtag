import { isPlausibleVendorLine } from "@/lib/ocr/vendor-from-text";

const UNREADABLE =
  /nicht\s+eindeutig\s+lesbar|unleserlich|unbekannt(?:e)?\s+werkstatt/i;

const OCR_GARBAGE =
  /(?:\+\+|rourviver|krackkm|^ind$|dioterlemmi|[^\p{L}\s]{4,})/iu;

const PAGE_WATERMARK =
  /(?:qa[-\s]*test|keine\s+echte\s+urkunde|demo[-\s]*wasserzeichen|wasserzeichen|probe[-\s]*druck)/i;

const TOO_SHORT = /^[\p{L}\p{N}]{1,2}$/u;

/** Workshop names that should never be stored verbatim from noisy OCR. */
export function sanitizeVendorForStorage(raw: string | null | undefined): {
  vendor: string | null;
  needsReview: boolean;
} {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return { vendor: null, needsReview: true };
  }
  if (UNREADABLE.test(trimmed)) {
    return { vendor: "Unbekannte Werkstatt", needsReview: true };
  }
  if (TOO_SHORT.test(trimmed)) {
    return { vendor: "Unbekannte Werkstatt", needsReview: true };
  }
  if (!isPlausibleVendorLine(trimmed) || OCR_GARBAGE.test(trimmed)) {
    return { vendor: "Unbekannte Werkstatt", needsReview: true };
  }
  if (PAGE_WATERMARK.test(trimmed)) {
    return { vendor: "Unbekannte Werkstatt", needsReview: true };
  }
  return { vendor: trimmed.slice(0, 160), needsReview: false };
}
