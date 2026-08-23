/**
 * Normalize Azure Document Intelligence OCR before TÜV heuristics run.
 * Fixes common layout noise without altering semantic content.
 */
export function normalizeTuevOcrText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[|│┃¦]/g, " ")
    .replace(/\(\s+(\d{1,2})\s+\)/g, "($1)")
    .replace(/(?:Prüf|Pruef)\s+ort/gi, "Prüfort")
    .replace(/(?:Prüf|Pruef)\s+termin/gi, "Prüftermin")
    .replace(/(?:Prüf|Pruef)\s+ungsdatum/gi, "Prüfungsdatum")
    .replace(/(?:Prüf|Pruef)\s+datum/gi, "Prüfdatum")
    .replace(/km\s*-\s*St\.?/gi, "km-St.")
    .replace(/km\s*\.\s*St\.?/gi, "km-St.")
    .replace(/Wegstrecken\s+z[aä]hler/gi, "Wegstreckenzähler")
    .replace(/Wegstrecken\s*-\s*z[aä]hler/gi, "Wegstreckenzähler")
    .replace(/\(\s*(EM|GM)\s*\)/g, "($1)")
    .replace(/([EG])\s+(M)\b/g, "$1$2")
    .replace(/(\d)\s+\.\s+(\d+(?:\.\d+)+[a-zA-Z]?)/g, "$1.$2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
