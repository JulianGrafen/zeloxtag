/**
 * Deduplication of repeated invoice tables in Azure Layout markdown.
 *
 * Azure Layout generates one HTML table per page it detects. When the same
 * invoice items table spans multiple physical pages (or is fully reprinted on
 * each page of a multi-page PDF), the markdown contains duplicate `<table>`
 * blocks — typically one per page separated by `<!-- PageBreak -->`.
 *
 * The first-page occurrence often has truncated Ges.-Preis values (the
 * rightmost column may be partially cut off by the scanner edge), while the
 * last-page occurrence has complete values ("331,98 € A" vs "331,98").
 * Sending both tables to the LLM confuses it, causing row-shifting errors.
 *
 * This module strips the earlier, incomplete duplicate(s), leaving only the
 * last (most complete) occurrence of the invoice items table in the text that
 * the LLM sees.
 */

const PAGE_BREAK = "<!-- PageBreak -->";

/**
 * The main invoice items table always starts with a `<th>` cell whose text
 * is "Pos" (the position column). Small header info tables use `<td>`, not
 * `<th>`, so this pattern uniquely identifies the line-items table.
 */
const INVOICE_ITEMS_TABLE_RE =
  /<table>(?:\s*[\s\S]*?)<tr>\s*<th[^>]*>\s*Pos\s*<\/th>[\s\S]*?<\/table>/gi;

function pageContainsInvoiceItemTable(pageText: string): boolean {
  INVOICE_ITEMS_TABLE_RE.lastIndex = 0;
  return INVOICE_ITEMS_TABLE_RE.test(pageText);
}

function removeInvoiceItemTableFromPage(pageText: string): string {
  INVOICE_ITEMS_TABLE_RE.lastIndex = 0;
  return pageText.replace(INVOICE_ITEMS_TABLE_RE, "").trim();
}

/**
 * When the invoice items table appears on multiple pages, removes it from all
 * but the last page so the LLM only sees the most complete version.
 *
 * Safe no-op when the table appears only once (single-page invoices).
 */
export function deduplicateInvoiceItemTable(markdown: string): string {
  const pages = markdown.split(PAGE_BREAK);

  if (pages.length <= 1) return markdown;

  const hasTable = pages.map((page) => pageContainsInvoiceItemTable(page));
  const lastTablePage = hasTable.lastIndexOf(true);

  // Only one (or zero) pages have the table — nothing to deduplicate.
  if (lastTablePage <= 0) return markdown;

  const deduped = pages.map((page, index) => {
    if (index < lastTablePage && hasTable[index]) {
      return removeInvoiceItemTableFromPage(page);
    }
    return page;
  });

  return deduped.join(PAGE_BREAK);
}
