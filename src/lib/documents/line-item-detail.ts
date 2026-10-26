export type LineItemLabelParts = {
  title: string;
  detail: string | null;
};

const NUMBER = String.raw`\d+(?:[.,]\d+)?`;

/** Labor time, quantity, or volume fragments printed inside OCR position labels. */
const DETAIL_FRAGMENTS: readonly RegExp[] = [
  new RegExp(String.raw`(?:^|\s)(${NUMBER}\s*(?:Std\.?|Stunden?|AW))(?=\s|$|[,;])`, "i"),
  new RegExp(String.raw`(?:^|\s)(${NUMBER}\s*(?:Stk\.?|Stück|St\.))(?=\s|$|[,;])`, "i"),
  new RegExp(String.raw`(?:^|\s)(${NUMBER}\s*(?:Liter|l))(?=\s|$|[,;])`),
  new RegExp(String.raw`(?:^|\s)(${NUMBER}\s*x)(?=\s)`, "i"),
];

const EDGE_SEPARATORS = /^[\s,;:·\-–]+|[\s,;:·\-–]+$/g;

function cleanFragment(value: string): string {
  return value.replace(EDGE_SEPARATORS, "").replace(/\s{2,}/g, " ").trim();
}

function extractDetail(line: string): LineItemLabelParts {
  for (const pattern of DETAIL_FRAGMENTS) {
    const match = line.match(pattern);
    const fragment = match?.[1];
    if (!fragment) continue;
    const title = cleanFragment(line.replace(fragment, " "));
    if (!title) continue;
    return { title, detail: cleanFragment(fragment) };
  }
  return { title: cleanFragment(line), detail: null };
}

/**
 * "Arbeitszeit Inspektion 2,5 Std" → { title: "Arbeitszeit Inspektion", detail: "2,5 Std" }.
 * Additional label lines become part of the detail.
 */
export function splitLineItemLabel(label: string): LineItemLabelParts {
  const lines = label
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { title: label.trim(), detail: null };

  const [firstLine, ...restLines] = lines;
  const { title, detail } = extractDetail(firstLine);
  const details = [detail, ...restLines].filter(
    (part): part is string => Boolean(part),
  );

  return {
    title: title || firstLine,
    detail: details.length > 0 ? details.join(" · ") : null,
  };
}
