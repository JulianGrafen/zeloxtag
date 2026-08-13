/**
 * Annotate invoice item table rows with Z01/Z02/… markers before the LLM.
 *
 * This is the text-LLM equivalent of the vision zebra + left-marker overlays
 * ({@link drawInvoiceRowSeparatorsOnImage}). Each data row gets an explicit
 * row id so the model cannot shift Menge / E-Preis / Ges. Preis across rows.
 *
 * Supports Azure Layout HTML tables and Markdown pipe tables.
 * Small metadata tables (< 4 rows or < 3 columns) are left untouched.
 */

const MIN_ROWS = 4;
const MIN_COLS = 3;

function countHtmlRows(tableHtml: string): number {
  return (tableHtml.match(/<tr[\s>]/gi) ?? []).length;
}

function countHtmlColumns(tableHtml: string): number {
  const firstRow = /<tr[\s>][^]*?<\/tr>/i.exec(tableHtml)?.[0] ?? "";
  return (firstRow.match(/<t[hd][\s>]/gi) ?? []).length;
}

function formatRowMarker(index: number): string {
  return `Z${String(index).padStart(2, "0")}`;
}

function isHeaderRow(rowHtml: string): boolean {
  return /<th[\s>]/i.test(rowHtml);
}

/**
 * Insert a leading Znn cell into every data row of an invoice-sized HTML table.
 * Header rows get a "Z" column header.
 */
function annotateHtmlTable(tableHtml: string): string {
  const rows = tableHtml.match(/<tr[\s>][\s\S]*?<\/tr>/gi);
  if (!rows || rows.length < MIN_ROWS) return tableHtml;
  if (countHtmlColumns(tableHtml) < MIN_COLS) return tableHtml;

  let dataIndex = 0;
  let result = tableHtml;

  for (const row of rows) {
    let annotated: string;
    if (isHeaderRow(row)) {
      annotated = row.replace(/<tr([^>]*)>/i, "<tr$1><th>Z</th>");
    } else {
      dataIndex += 1;
      const marker = formatRowMarker(dataIndex);
      annotated = row.replace(
        /<tr([^>]*)>/i,
        `<tr$1><td><strong>${marker}</strong></td>`,
      );
    }
    result = result.replace(row, annotated);
  }

  return result;
}

/**
 * Annotate every invoice-sized HTML <table> in the markdown.
 */
export function annotateHtmlInvoiceTables(markdown: string): string {
  return markdown.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (table) => {
    if (countHtmlRows(table) < MIN_ROWS || countHtmlColumns(table) < MIN_COLS) {
      return table;
    }
    return annotateHtmlTable(table);
  });
}

function countPipeColumns(line: string): number {
  return (line.match(/\|/g) ?? []).length - 1;
}

function isPipeSeparator(line: string): boolean {
  return /^\|[-: |]+\|\s*$/.test(line.trim());
}

/**
 * Annotate pipe-table data rows with a leading Znn column.
 */
export function annotatePipeInvoiceTables(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const next = lines[i + 1] ?? "";

    const isPipeHeader =
      line.trim().startsWith("|") &&
      countPipeColumns(line) >= MIN_COLS &&
      isPipeSeparator(next);

    if (!isPipeHeader) {
      out.push(line);
      i += 1;
      continue;
    }

    // Collect the full pipe table block.
    const blockStart = i;
    i += 2; // skip header + separator
    while (i < lines.length && lines[i]!.trim().startsWith("|")) {
      i += 1;
    }
    const block = lines.slice(blockStart, i);
    const dataRowCount = block.length - 2;

    if (dataRowCount < MIN_ROWS - 1) {
      // Too small — keep as-is.
      out.push(...block);
      continue;
    }

    const header = block[0]!;
    const sep = block[1]!;
    out.push(header.replace(/^\|/, "| Z |"));
    out.push(sep.replace(/^\|/, "|----|"));

    let dataIndex = 0;
    for (const dataRow of block.slice(2)) {
      dataIndex += 1;
      const marker = formatRowMarker(dataIndex);
      out.push(dataRow.replace(/^\|/, `| ${marker} |`));
    }
  }

  return out.join("\n");
}

/**
 * Annotate invoice item tables in Azure Layout markdown with Z01/Z02/… markers
 * so the text LLM can anchor every column to the correct row — same role as
 * the visual zebra/Z markers on the vision path.
 */
export function annotateInvoiceTableRows(markdown: string): string {
  const withHtml = annotateHtmlInvoiceTables(markdown);
  return annotatePipeInvoiceTables(withHtml);
}
