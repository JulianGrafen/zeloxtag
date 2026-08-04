/**
 * Azure Document Intelligence `outputContentFormat=markdown` often embeds
 * HTML `<table>/<td>` blocks. Downstream parsers must read cell *text*, not tags.
 */

const HTML_ENTITY: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number.parseInt(code, 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&([a-z]+);/gi, (_, name: string) => HTML_ENTITY[name.toLowerCase()] ?? "");
}

/** Strip tags; keep inner text. */
export function stripHtmlTags(value: string): string {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cellsFromRow(rowHtml: string): string[] {
  return [...rowHtml.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((match) =>
    stripHtmlTags(match[1] ?? "").replace(/\s+/g, " ").trim(),
  );
}

/**
 * Convert one HTML `<table>` into GitHub-flavored pipe Markdown rows.
 */
export function htmlTableToMarkdown(tableHtml: string): string {
  const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (rows.length === 0) {
    const fallback = stripHtmlTags(tableHtml);
    return fallback ? `${fallback}\n` : "";
  }

  const lines: string[] = [];
  for (const row of rows) {
    const cells = cellsFromRow(row[1] ?? "");
    if (cells.length === 0 || cells.every((cell) => !cell)) continue;
    lines.push(`| ${cells.join(" | ")} |`);
  }

  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

/**
 * Normalize OCR Markdown so line-item extractors / LLMs see readable tables.
 */
export function normalizeOcrMarkdown(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");

  text = text.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (table) => {
    const md = htmlTableToMarkdown(table);
    return md ? `\n${md}\n` : "\n";
  });

  // Orphan rows / cells outside a complete <table> block.
  text = text.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (row) => {
    const cells = cellsFromRow(row);
    if (cells.length === 0 || cells.every((cell) => !cell)) return "\n";
    return `\n| ${cells.join(" | ")} |\n`;
  });

  text = stripHtmlTags(text);
  return text.replace(/\n{4,}/g, "\n\n\n").trim();
}

/** True when a label is HTML chrome / tag debris, not a product name. */
export function isHtmlDebrisLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return true;
  if (/^<\/?[a-z][a-z0-9]*\b[^>]*>$/i.test(trimmed)) return true;
  const withoutTags = stripHtmlTags(trimmed);
  if (!withoutTags) return true;
  if (/^(?:td|th|tr|table|thead|tbody|tfoot|div|span|p|br|html|body)$/i.test(withoutTags)) {
    return true;
  }
  // Mostly tag soup: "<td> <td> Motoröl" after partial strip still noisy.
  if ((trimmed.match(/<\/?[a-z][a-z0-9]*\b/gi) ?? []).length >= 2) {
    return true;
  }
  return false;
}
