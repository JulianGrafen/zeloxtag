export function isAuflageSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.endsWith(":")) return false;
  if ((trimmed.match(/:/g) ?? []).length !== 1) return false;

  const title = trimmed.slice(0, -1).trim();
  if (title.length < 8 || title.length > 120) return false;
  if (/[.!?]$/.test(title)) return false;

  return true;
}

function stripListMarker(line: string): string {
  return line.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
}

/** Flatten OCR/LLM fragments — one string may contain multiple lines. */
export function flattenAuflagenInput(values: string[]): string[] {
  return values.flatMap((value) =>
    value
      .split(/\n+/)
      .map(stripListMarker)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );
}

/**
 * Merge TGA Auflagen headings (ending with ":") with their following paragraphs.
 * "Berichtigung der Fahrzeugpapiere:" + body → one item, not two list entries.
 */
export function groupTeilegutachtenAuflagen(items: string[]): string[] {
  const lines = flattenAuflagenInput(items);
  if (lines.length === 0) return [];

  const grouped: string[] = [];
  let currentHeading: string | null = null;
  const bodyParts: string[] = [];

  const flush = () => {
    if (currentHeading) {
      const body = bodyParts.join("\n\n").trim();
      grouped.push(body ? `${currentHeading}\n${body}` : currentHeading);
    } else {
      grouped.push(...bodyParts);
    }
    currentHeading = null;
    bodyParts.length = 0;
  };

  for (const line of lines) {
    if (isAuflageSectionHeading(line)) {
      flush();
      currentHeading = line;
      continue;
    }

    const embeddedColon = line.indexOf(":");
    if (
      embeddedColon > 8 &&
      embeddedColon <= 120 &&
      !currentHeading &&
      isAuflageSectionHeading(`${line.slice(0, embeddedColon + 1)}`)
    ) {
      grouped.push(line);
      continue;
    }

    if (currentHeading) {
      bodyParts.push(line);
    } else {
      grouped.push(line);
    }
  }

  flush();
  return grouped;
}

export function splitAuflageHeading(text: string): {
  heading: string | null;
  body: string;
} {
  const firstLineBreak = text.indexOf("\n");
  if (firstLineBreak >= 0) {
    const firstLine = text.slice(0, firstLineBreak).trim();
    const rest = text.slice(firstLineBreak + 1).trim();
    if (isAuflageSectionHeading(firstLine)) {
      return {
        heading: firstLine.slice(0, -1).trim(),
        body: rest,
      };
    }
  }

  const colonIndex = text.indexOf(":");
  if (colonIndex <= 0 || colonIndex > 120) {
    return { heading: null, body: text };
  }

  const heading = text.slice(0, colonIndex).trim();
  const body = text.slice(colonIndex + 1).trim();
  if (!body || !isAuflageSectionHeading(`${heading}:`)) {
    return { heading: null, body: text };
  }

  return { heading, body };
}
