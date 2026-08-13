import { describe, expect, it } from "vitest";
import { deduplicateInvoiceItemTable } from "./markdown-page-dedup";

// ─── HTML table fixtures ─────────────────────────────────────────────────────

function buildHtmlInvoiceTable(rows: number, complete: boolean): string {
  const headerLabel = complete ? "Ges. Preis St." : "Ges. Prei";
  const priceFormat = (i: number) =>
    complete ? `${i * 10},00 € A` : `${i * 10},0`; // truncated on page 1

  const dataRows = Array.from(
    { length: rows },
    (_, i) => `
<tr>
<td>${i + 1}</td>
<td>Artikel ${i + 1}</td>
<td>${i + 1},00</td>
<td>${(i + 1) * 5},00 €</td>
<td>${priceFormat(i + 1)}</td>
</tr>`,
  ).join("");

  return `
<table>
<tr>
<th>Pos</th>
<th>Bezeichnung/Beschreibung</th>
<th>Menge</th>
<th>E-Preis</th>
<th>${headerLabel}</th>
</tr>
${dataRows}
</table>`.trim();
}

// Metadata table — 2 columns, must never be removed.
const HEADER_TABLE = `
<table>
<tr>
<td>Marke:</td>
<td>BMW</td>
</tr>
<tr>
<td>Modell:</td>
<td>5er</td>
</tr>
</table>`.trim();

// ─── Pipe table fixture ──────────────────────────────────────────────────────

function buildPipeInvoiceTable(rows: number, complete: boolean): string {
  const priceFormat = (i: number) => (complete ? `${i * 10},00 €` : `${i * 10},`);
  const header = "| Pos | Bezeichnung | Menge | E-Preis | Ges. Preis |";
  const sep = "|-----|-------------|-------|---------|------------|";
  const dataRows = Array.from(
    { length: rows },
    (_, i) => `| ${i + 1} | Artikel ${i + 1} | ${i + 1},00 | ${(i + 1) * 5},00 € | ${priceFormat(i + 1)} |`,
  );
  return [header, sep, ...dataRows].join("\n");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("deduplicateInvoiceItemTable", () => {
  describe("HTML tables", () => {
    it("removes the items table from page 1 when a complete copy exists on page 2", () => {
      const page1 = `${HEADER_TABLE}\n${buildHtmlInvoiceTable(8, false)}`;
      const page2 = `${HEADER_TABLE}\n${buildHtmlInvoiceTable(8, true)}`;
      const markdown = [page1, page2].join("\n<!-- PageBreak -->\n");

      const result = deduplicateInvoiceItemTable(markdown);

      // Complete page-2 table preserved
      expect(result).toContain("Ges. Preis St.");
      expect(result).toContain("80,00 € A");

      // Truncated page-1 table removed
      expect(result).not.toContain("Ges. Prei</th>");

      // Metadata tables on both pages kept
      expect(result.match(/Marke:/g)?.length).toBe(2);
      expect(result).toContain("<!-- PageBreak -->");
    });

    it("is a no-op on a single-page invoice", () => {
      const markdown = buildHtmlInvoiceTable(10, true);
      expect(deduplicateInvoiceItemTable(markdown)).toBe(markdown);
    });

    it("does NOT deduplicate when page 2 has significantly fewer rows (split table)", () => {
      const page1 = buildHtmlInvoiceTable(12, true); // rows 1-12
      const page2 = buildHtmlInvoiceTable(6, true);  // rows 13-18 (continuation)
      const markdown = [page1, page2].join("\n<!-- PageBreak -->\n");

      const result = deduplicateInvoiceItemTable(markdown);

      // Both tables preserved — page 2 is only 50 % of page 1 (< 80 % threshold)
      expect(result.match(/<table>/g)?.length).toBe(2);
    });

    it("does not remove small metadata tables (< 4 columns)", () => {
      const page1 = `${HEADER_TABLE}\n${buildHtmlInvoiceTable(8, false)}`;
      const page2 = `${HEADER_TABLE}\n${buildHtmlInvoiceTable(8, true)}`;
      const markdown = [page1, page2].join("\n<!-- PageBreak -->\n");

      const result = deduplicateInvoiceItemTable(markdown);
      expect(result.match(/Marke:/g)?.length).toBe(2);
    });

    it("works without a Pos column (4-column invoice: Bezeichnung/Menge/E-Preis/Ges.Preis)", () => {
      function buildNoPos(rows: number, complete: boolean): string {
        const priceFormat = (i: number) => (complete ? `${i * 10},00 € A` : `${i * 10},0`);
        const dataRows = Array.from(
          { length: rows },
          (_, i) => `<tr><td>Artikel ${i + 1}</td><td>${i + 1},00</td><td>${(i + 1) * 5},00 €</td><td>${priceFormat(i + 1)}</td></tr>`,
        ).join("");
        return `<table><tr><th>Bezeichnung</th><th>Menge</th><th>E-Preis</th><th>Ges. Preis</th></tr>${dataRows}</table>`;
      }

      const page1 = buildNoPos(8, false);
      const page2 = buildNoPos(8, true);
      const markdown = [page1, page2].join("\n<!-- PageBreak -->\n");

      const result = deduplicateInvoiceItemTable(markdown);

      expect(result).toContain("80,00 € A"); // complete version kept
      expect(result.match(/<table>/g)?.length).toBe(1); // only one table remains
    });

    it("handles three-page invoice where only the last table is complete", () => {
      const page1 = `${HEADER_TABLE}\n${buildHtmlInvoiceTable(8, false)}`;
      const page2 = `${HEADER_TABLE}\n${buildHtmlInvoiceTable(8, false)}`;
      const page3 = `${HEADER_TABLE}\n${buildHtmlInvoiceTable(8, true)}`;
      const markdown = [page1, page2, page3].join("\n<!-- PageBreak -->\n");

      const result = deduplicateInvoiceItemTable(markdown);

      // Only one items table remains (from page 3)
      const tableMatches = result.match(/<table>[\s\S]*?<\/table>/gi) ?? [];
      const itemsTables = tableMatches.filter((t) =>
        t.includes("Ges. Preis St."),
      );
      expect(itemsTables).toHaveLength(1);

      // Metadata tables on all three pages preserved
      expect(result.match(/Marke:/g)?.length).toBe(3);
    });
  });

  describe("Pipe tables", () => {
    it("deduplicates pipe-format invoice tables across pages", () => {
      const page1 = buildPipeInvoiceTable(8, false);
      const page2 = buildPipeInvoiceTable(8, true);
      const markdown = [page1, page2].join("\n<!-- PageBreak -->\n");

      const result = deduplicateInvoiceItemTable(markdown);

      // Complete page-2 pipe table preserved
      expect(result).toContain("80,00 €");

      // Truncated page-1 table removed
      const pipeTableCount = (result.match(/\| Pos \|/g) ?? []).length;
      expect(pipeTableCount).toBe(1);
    });
  });
});
