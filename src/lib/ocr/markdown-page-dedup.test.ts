import { describe, expect, it } from "vitest";
import { deduplicateInvoiceItemTable } from "./markdown-page-dedup";

const ITEMS_TABLE_PAGE1 = `
<table>
<tr>
<th>Pos</th>
<th>Bezeichnung/Beschreibung</th>
<th>Menge</th>
<th>E-Preis</th>
<th>Ges. Prei</th>
</tr>
<tr>
<td>4</td>
<td>Bremsscheibe PRO+</td>
<td>2,00</td>
<td>165,99 €</td>
<td>331,98</td>
</tr>
<tr>
<td>10</td>
<td>Kühlerfrostschutz</td>
<td>3,00 Liter</td>
<td>7,14 €</td>
<td>21,4</td>
</tr>
</table>
`.trim();

const ITEMS_TABLE_PAGE2 = `
<table>
<tr>
<th>Pos</th>
<th>Bezeichnung/Beschreibung</th>
<th>Menge</th>
<th>E-Preis</th>
<th>Ges. Preis St.</th>
</tr>
<tr>
<td>4</td>
<td>Bremsscheibe PRO+</td>
<td>2,00</td>
<td>165,99 €</td>
<td>331,98 € A</td>
</tr>
<tr>
<td>10</td>
<td>Kühlerfrostschutz</td>
<td>3,00 Liter</td>
<td>7,14 €</td>
<td>21,42 € A</td>
</tr>
</table>
`.trim();

// Small metadata table (Marke/Modell etc.) — must NOT be touched.
const HEADER_TABLE = `
<table>
<tr>
<td>Marke:</td>
<td>BMW</td>
</tr>
</table>
`.trim();

describe("deduplicateInvoiceItemTable", () => {
  it("removes the invoice items table from page 1 when it also appears on page 2", () => {
    const markdown = [
      `Header info\n${HEADER_TABLE}\n${ITEMS_TABLE_PAGE1}`,
      `Header info\n${HEADER_TABLE}\n${ITEMS_TABLE_PAGE2}`,
    ].join("\n<!-- PageBreak -->\n");

    const result = deduplicateInvoiceItemTable(markdown);

    // Page 2's complete table is preserved
    expect(result).toContain("331,98 € A");
    expect(result).toContain("21,42 € A");

    // Page 1's truncated table is removed
    expect(result).not.toContain("Ges. Prei</th>");
    expect(result).not.toContain("<td>21,4</td>");

    // Metadata tables on page 1 are kept
    expect(result).toContain("Marke:");
    expect(result).toContain("<!-- PageBreak -->");
  });

  it("is a no-op when the table appears only once (single-page invoice)", () => {
    const markdown = `Header\n${ITEMS_TABLE_PAGE2}`;
    expect(deduplicateInvoiceItemTable(markdown)).toBe(markdown);
  });

  it("is a no-op when there is no invoice items table at all", () => {
    const markdown = `Header\n${HEADER_TABLE}\n<!-- PageBreak -->\nPage 2`;
    expect(deduplicateInvoiceItemTable(markdown)).toBe(markdown);
  });

  it("does not touch non-invoice tables (no <th>Pos</th>)", () => {
    const markdown = `${HEADER_TABLE}\n<!-- PageBreak -->\n${HEADER_TABLE}`;
    expect(deduplicateInvoiceItemTable(markdown)).toBe(markdown);
  });
});
