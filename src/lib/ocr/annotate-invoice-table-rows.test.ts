import { describe, expect, it } from "vitest";

import { annotateInvoiceTableRows } from "./annotate-invoice-table-rows";

const HTML_ITEMS_TABLE = `
<table>
<tr>
<th>Pos</th>
<th>Bezeichnung/Beschreibung</th>
<th>Menge</th>
<th>E-Preis</th>
<th>Ges. Preis</th>
</tr>
<tr>
<td>1</td>
<td>Bremsbelagsatz, Scheibenbremse</td>
<td>1,00</td>
<td>141,46 €</td>
<td>141,46 €</td>
</tr>
<tr>
<td>4</td>
<td>Bremsscheibe PRO+</td>
<td>2,00</td>
<td>165,99 €</td>
<td>331,98 €</td>
</tr>
<tr>
<td>5</td>
<td>Beide Bremsscheiben erneuern (Hinterachse)</td>
<td>0,90</td>
<td>90,00 €</td>
<td>81,00 €</td>
</tr>
<tr>
<td>10</td>
<td>Kühlerfrostschutz</td>
<td>3,00 Liter</td>
<td>7,14 €</td>
<td>21,42 €</td>
</tr>
</table>
`.trim();

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
</table>
`.trim();

describe("annotateInvoiceTableRows", () => {
  it("adds Znn markers to HTML invoice item tables", () => {
    const result = annotateInvoiceTableRows(HTML_ITEMS_TABLE);

    expect(result).toContain("<th>Z</th>");
    expect(result).toContain("<strong>Z01</strong>");
    expect(result).toContain("<strong>Z02</strong>");
    expect(result).toContain("<strong>Z04</strong>");
    expect(result).toContain("Bremsscheibe PRO+");
    expect(result).toContain("331,98 €");
  });

  it("does not annotate small metadata tables", () => {
    const result = annotateInvoiceTableRows(HEADER_TABLE);
    expect(result).toBe(HEADER_TABLE);
    expect(result).not.toContain("Z01");
  });

  it("annotates pipe tables with a leading Z column", () => {
    const pipe = [
      "| Pos | Bezeichnung | Menge | E-Preis | Ges. Preis |",
      "|-----|-------------|-------|---------|------------|",
      "| 1 | Bremsbelagsatz | 1,00 | 141,46 € | 141,46 € |",
      "| 4 | Bremsscheibe PRO+ | 2,00 | 165,99 € | 331,98 € |",
      "| 5 | Beide Bremsscheiben | 0,90 | 90,00 € | 81,00 € |",
      "| 10 | Kühlerfrostschutz | 3,00 | 7,14 € | 21,42 € |",
    ].join("\n");

    const result = annotateInvoiceTableRows(pipe);

    expect(result).toContain("| Z |");
    expect(result).toContain("| Z01 |");
    expect(result).toContain("| Z02 |");
    expect(result).toContain("| Z04 |");
    expect(result).toContain("331,98 €");
  });

  it("preserves metadata tables next to annotated item tables", () => {
    const markdown = `${HEADER_TABLE}\n\n${HTML_ITEMS_TABLE}`;
    const result = annotateInvoiceTableRows(markdown);

    expect(result).toContain("Marke:");
    expect(result).toContain("<strong>Z01</strong>");
    expect(result.match(/Marke:/g)?.length).toBe(1);
  });
});
