/**
 * Deduplication of repeated invoice tables in Azure Layout markdown.
 *
 * Azure Layout generates one table block per physical page. When an invoice
 * items table is printed in full on both pages (as happens with many German
 * KFZ-Werkstatt invoices where page 1 is the invoice copy and page 2 is the
 * customer copy), the markdown contains a duplicate of the same table.
 *
 * The first-page copy is often incomplete: the rightmost Ges.-Preis column
 * may be truncated by the scanner edge ("21,4" instead of "21,42 € A").
 * Sending both tables to the LLM causes systematic row-shifting errors.
 *
 * Strategy:
 *   1. Split at every <!-- PageBreak -->.
 *   2. On each page, find the LARGEST table (the invoice items table).
 *   3. Characterise it by (rowCount, columnCount).
 *   4. When a later page has a table of similar size, the earlier one is a
 *      duplicate — strip it (metadata tables like Marke/Modell are kept).
 *
 * Table formats supported:
 *   • HTML  — <table>…</table>  (Azure Layout default for structured tables)
 *   • Pipe  — | Col | Col |     (Azure Layout fallback for simple tables)
 *
 * Conservative duplicate threshold: later-page row count must be ≥ 80 % of
 * earlier-page row count.  A genuine continuation page typically has far
 * fewer rows, so it is never misidentified as a duplicate.
 */

const PAGE_BREAK = "<!-- PageBreak -->";

// ─── HTML table helpers ───────────────────────────────────────────────────────

/** Match every complete <table>…</table> block (non-greedy). */
const HTML_TABLE_RE = /<table\b[^>]*>[\s\S]*?<\/table>/gi;

function countHtmlRows(tableHtml: string): number {
  return (tableHtml.match(/<tr[\s>]/gi) ?? []).length;
}

function countHtmlColumns(tableHtml: string): number {
  const firstRow = /<tr[\s>][^]*?<\/tr>/i.exec(tableHtml)?.[0] ?? "";
  return (firstRow.match(/<t[hd][\s>]/gi) ?? []).length;
}

type TableDescriptor = {
  raw: string;
  rows: number;
  cols: number;
};

/** Extract all HTML tables from a page section, largest-first. */
function extractHtmlTables(pageText: string): TableDescriptor[] {
  const tables: TableDescriptor[] = [];
  const re = new RegExp(HTML_TABLE_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(pageText)) !== null) {
    const raw = match[0];
    tables.push({ raw, rows: countHtmlRows(raw), cols: countHtmlColumns(raw) });
  }
  return tables.sort((a, b) => b.rows - a.rows);
}

// ─── Pipe-table helpers ───────────────────────────────────────────────────────

/**
 * Match a pipe table: header row + separator row + ≥1 data rows.
 * Each row must have ≥ 2 pipe characters (≥ 1 column).
 */
const PIPE_TABLE_RE =
  /(?:^|\n)((?:\|[^\n]+\|[ \t]*\n){1}(?:\|[-: |]+\|[ \t]*\n)(?:\|[^\n]+\|[ \t]*\n){2,})/gm;

function countPipeRows(block: string): number {
  return (block.match(/^\|/gm) ?? []).length;
}

function countPipeColumns(block: string): number {
  const firstLine = block.split("\n")[0] ?? "";
  return (firstLine.match(/\|/g) ?? []).length - 1;
}

function extractPipeTables(pageText: string): TableDescriptor[] {
  const tables: TableDescriptor[] = [];
  const re = new RegExp(PIPE_TABLE_RE.source, PIPE_TABLE_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(pageText)) !== null) {
    const raw = match[1] ?? match[0];
    tables.push({ raw, rows: countPipeRows(raw), cols: countPipeColumns(raw) });
  }
  return tables.sort((a, b) => b.rows - a.rows);
}

// ─── Core logic ──────────────────────────────────────────────────────────────

/** Minimum rows / columns for a table to be considered an invoice items table. */
const MIN_ROWS = 4;
const MIN_COLS = 3;

/**
 * If later-page rowCount / earlier-page rowCount ≥ this threshold, the tables
 * are considered duplicates (same table printed on both pages).
 * A genuine split-table continuation is usually ≤ 60 % of the earlier size.
 */
const DUPLICATE_RATIO_THRESHOLD = 0.80;

function largestTable(pageText: string): TableDescriptor | null {
  const htmlTables = extractHtmlTables(pageText).filter(
    (t) => t.rows >= MIN_ROWS && t.cols >= MIN_COLS,
  );
  if (htmlTables.length > 0) return htmlTables[0]!;

  const pipeTables = extractPipeTables(pageText).filter(
    (t) => t.rows >= MIN_ROWS && t.cols >= MIN_COLS,
  );
  if (pipeTables.length > 0) return pipeTables[0]!;

  return null;
}

function isDuplicateOf(earlier: TableDescriptor, later: TableDescriptor): boolean {
  if (earlier.cols !== later.cols) return false;
  return later.rows / earlier.rows >= DUPLICATE_RATIO_THRESHOLD;
}

/**
 * When the invoice items table appears on multiple pages, removes it from all
 * but the last page so the LLM only sees the most complete version.
 *
 * Safe no-op when:
 *   • There is only one page (no <!-- PageBreak -->).
 *   • The large table appears on only one page.
 *   • The later table is much smaller (genuine continuation, not duplicate).
 */
export function deduplicateInvoiceItemTable(markdown: string): string {
  const pages = markdown.split(PAGE_BREAK);
  if (pages.length <= 1) return markdown;

  // Characterise every page by its largest invoice-like table.
  const pageTables = pages.map((page) => largestTable(page));

  // Find the last page that has an invoice-like table.
  const lastTablePage = pageTables.reduceRight<number>(
    (found, t, i) => (found === -1 && t != null ? i : found),
    -1,
  );

  if (lastTablePage <= 0) return markdown; // Nothing to deduplicate.

  const referenceTable = pageTables[lastTablePage]!;

  const deduped = pages.map((page, index) => {
    if (index >= lastTablePage) return page;

    const table = pageTables[index];
    if (table == null || !isDuplicateOf(table, referenceTable)) return page;

    // Strip only the large duplicate table; keep metadata tables and headers.
    return page.replace(table.raw, "").trim();
  });

  return deduped.join(PAGE_BREAK);
}
