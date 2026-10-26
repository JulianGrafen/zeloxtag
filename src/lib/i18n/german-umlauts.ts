type UmlautRule = {
  pattern: RegExp;
  replacement: string;
};

/**
 * Stems that only occur as ASCII-transliterated umlauts in OCR / LLM output.
 * Deliberately no generic `ue → ü` rule: "Steuer", "neue", "Feuer", "Queue" stay intact.
 */
const UMLAUT_RULES: readonly UmlautRule[] = [
  { pattern: /fluessig/gi, replacement: "flüssig" },
  /* Suffix guard keeps English "refuelling" intact. */
  { pattern: /fuell(?=en|t\b|ung)/gi, replacement: "füll" },
  { pattern: /schluessel/gi, replacement: "schlüssel" },
  { pattern: /kuehl/gi, replacement: "kühl" },
  { pattern: /zuend/gi, replacement: "zünd" },
  { pattern: /daempf/gi, replacement: "dämpf" },
  { pattern: /pruef/gi, replacement: "prüf" },
  { pattern: /gebuehr/gi, replacement: "gebühr" },
  { pattern: /raeder/gi, replacement: "räder" },
  { pattern: /waesch/gi, replacement: "wäsch" },
  { pattern: /buerst/gi, replacement: "bürst" },
  { pattern: /fuehr/gi, replacement: "führ" },
  { pattern: /luefter/gi, replacement: "lüfter" },
  { pattern: /haeng/gi, replacement: "häng" },
  { pattern: /geraeusch/gi, replacement: "geräusch" },
  { pattern: /aender/gi, replacement: "änder" },
  { pattern: /belaeg/gi, replacement: "beläg" },
  { pattern: /blaett/gi, replacement: "blätt" },
  { pattern: /schlaeuch/gi, replacement: "schläuch" },
  { pattern: /rueck/gi, replacement: "rück" },
  { pattern: /stueck/gi, replacement: "stück" },
  { pattern: /zubehoer/gi, replacement: "zubehör" },
  { pattern: /\bueber/gi, replacement: "über" },
  { pattern: /\bfuer\b/gi, replacement: "für" },
  { pattern: /\btuer/gi, replacement: "tür" },
  {
    pattern:
      /(?:\b|(?<=motor|getriebe|hydraulik|servo|differenzial|differential|achs|kompressor))oel/gi,
    replacement: "öl",
  },
];

function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  const first = source.charAt(0);
  if (first === first.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** "Bremsfluessigkeit" → "Bremsflüssigkeit"; leaves correct German untouched. */
export function restoreGermanUmlauts(text: string): string {
  return UMLAUT_RULES.reduce(
    (current, rule) =>
      current.replace(rule.pattern, (match) => matchCase(match, rule.replacement)),
    text,
  );
}
