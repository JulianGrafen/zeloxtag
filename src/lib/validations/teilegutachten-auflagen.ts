export function isIvSubsectionHeading(line: string): boolean {
  return /^IV\.\d+\.\s+.+/.test(line.trim());
}

export function isIvMainSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^IV\.\s+(?:Hinweise\s+und\s+)?Auflagen/i.test(trimmed) &&
    !/^IV\.\d/.test(trimmed)
  );
}

export function isAuflageSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (isIvSubsectionHeading(trimmed)) return true;
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
 * Parse IV.1–IV.n blocks — preserves numbered list lines verbatim.
 */
export function parseIvSubsectionsFromSectionBody(sectionBody: string): string[] {
  const lines = sectionBody.replace(/\r\n/g, "\n").split("\n");
  const subsections: string[] = [];
  let currentHeading: string | null = null;
  const bodyLines: string[] = [];

  const flush = () => {
    if (!currentHeading) return;
    const body = bodyLines.join("\n").replace(/\n+$/, "");
    subsections.push(body ? `${currentHeading}\n${body}` : currentHeading);
    currentHeading = null;
    bodyLines.length = 0;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (currentHeading) bodyLines.push("");
      continue;
    }
    if (isIvSubsectionHeading(trimmed)) {
      flush();
      currentHeading = trimmed;
      continue;
    }
    if (isIvMainSectionHeading(trimmed)) continue;
    if (currentHeading) {
      bodyLines.push(trimmed);
    }
  }

  flush();
  return subsections;
}

function groupColonHeadingAuflagen(items: string[]): string[] {
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
    if (isIvSubsectionHeading(line)) {
      flush();
      grouped.push(line);
      continue;
    }

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

/**
 * Merge TGA Auflagen headings (ending with ":") with their following paragraphs.
 * "Berichtigung der Fahrzeugpapiere:" + body → one item, not two list entries.
 */
export function groupTeilegutachtenAuflagen(items: string[]): string[] {
  if (items.length === 0) return [];

  const joined = items.join("\n");
  if (/^IV\.\d+\./m.test(joined)) {
    const parsed = parseIvSubsectionsFromSectionBody(joined);
    if (parsed.length > 0) return parsed;
  }

  const ivBlocks = items.filter((item) => {
    const firstLine = item.trim().split("\n")[0] ?? "";
    return isIvSubsectionHeading(firstLine);
  });
  if (ivBlocks.length > 0) {
    const other = items.filter((item) => {
      const firstLine = item.trim().split("\n")[0] ?? "";
      return !isIvSubsectionHeading(firstLine);
    });
    return [
      ...ivBlocks,
      ...(other.length > 0 ? groupColonHeadingAuflagen(other) : []),
    ];
  }

  return groupColonHeadingAuflagen(items);
}

export function isIvStructuredAuflagen(items: string[]): boolean {
  const grouped = groupTeilegutachtenAuflagen(items);
  return (
    grouped.length > 0 &&
    grouped.every((item) => {
      const firstLine = item.trim().split("\n")[0] ?? "";
      return isIvSubsectionHeading(firstLine);
    })
  );
}

export function splitAuflageHeading(text: string): {
  heading: string | null;
  body: string;
} {
  const firstLineBreak = text.indexOf("\n");
  if (firstLineBreak >= 0) {
    const firstLine = text.slice(0, firstLineBreak).trim();
    const rest = text.slice(firstLineBreak + 1).trim();
    if (isIvSubsectionHeading(firstLine)) {
      return { heading: firstLine, body: rest };
    }
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
