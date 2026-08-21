const QTY_PRICE_TAIL =
  /\s+\d+[,.]\d+\s+\d+[,.]\d+\s*$|\s+\d+[,.]\d+\s*€?\s*$/;

/** Strip OCR qty/price glue from invoice line labels on public showcase. */
export function humanizeShowcaseLabel(label: string): string {
  let value = label.trim();
  value = value.replace(QTY_PRICE_TAIL, "").trim();
  value = value.replace(/\s{2,}/g, " ");
  return value.slice(0, 120) || label.trim().slice(0, 120);
}
