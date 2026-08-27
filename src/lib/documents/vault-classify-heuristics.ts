import type {
  VaultCategory,
  VaultDocumentKind,
} from "@/lib/validations/vaultClassificationSchema";

export type VaultClassificationHint = {
  title: string;
  category: VaultCategory;
  documentKind: VaultDocumentKind | null;
};

const UNKNOWN_PART_TITLE = "Unbekanntes Bauteil";

function normalizeSearchText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractPartTitleFromText(raw: string): string | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const labelPatterns = [
    /^art der umr[uü]stung[:\s]+(.+)/i,
    /^bauteil[:\s]+(.+)/i,
    /^gegenstand[:\s]+(.+)/i,
    /^umr[uü]stung[:\s]+(.+)/i,
  ];

  for (const line of lines) {
    for (const pattern of labelPatterns) {
      const match = line.match(pattern);
      const value = match?.[1]?.trim();
      if (value && value.length >= 3 && value.length <= 160) {
        return value.slice(0, 160);
      }
    }
  }

  return null;
}

/**
 * Lightweight fallback when vault LLM classify fails — uses embedded PDF text.
 */
export function inferVaultClassificationFromText(
  rawText: string,
): VaultClassificationHint | null {
  const text = normalizeSearchText(rawText);
  if (text.replace(/\s+/g, "").length < 24) {
    return null;
  }

  let documentKind: VaultDocumentKind | null = null;

  if (
    /teilegutachten/.test(text) ||
    /§\s*19\s*abs\.?\s*3/.test(text) ||
    /19\s*\(\s*3\s*\)/.test(text)
  ) {
    documentKind = "teilegutachten";
  } else if (
    /einzelabnahme/.test(text) ||
    /§\s*21/.test(text) ||
    /stvzo\s*§\s*21/.test(text)
  ) {
    documentKind = "einzelabnahme";
  } else if (/allgemeine betriebserlaubnis|\bab[e]?\b/.test(text)) {
    documentKind = "abe";
  } else if (/eg-be|egbe|europaische genehmigung/.test(text)) {
    documentKind = "egbe";
  } else if (/§\s*19\s*\(\s*2\s*\)|prufbericht nach §19/.test(text)) {
    documentKind = "pruefung192";
  } else if (/gutachten/.test(text)) {
    documentKind = "gutachten";
  }

  if (!documentKind) {
    return null;
  }

  const extractedTitle = extractPartTitleFromText(rawText);
  const title =
    extractedTitle ??
    (documentKind === "teilegutachten"
      ? "Teilegutachten"
      : documentKind === "einzelabnahme"
        ? "Einzelabnahme"
        : documentKind === "abe"
          ? "ABE"
          : "Gutachten / ABE");

  let category: VaultCategory = "SONSTIGES";
  const titleBlob = normalizeSearchText(title);
  if (
    /fahrwerk|gewinde|coilover|stossd|federn|tieferlegung/.test(titleBlob) ||
    /fahrwerk|gewinde|coilover|stossd|federn|tieferlegung/.test(text)
  ) {
    category = "FAHRWERK";
  } else if (/felge|rad|reifen|wheel/.test(titleBlob) || /felge|rad|reifen/.test(text)) {
    category = "RÄDER_FELGEN";
  } else if (
    /spoiler|diffusor|schweller|karosserie|aero|frontlippe|heck/.test(titleBlob) ||
    /spoiler|diffusor|schweller|karosserie|aero/.test(text)
  ) {
    category = "AERODYNAMIK_KAROSSERIE";
  } else if (
    /motor|ansaug|abgasanlage|downpipe|turbo|kat|auspuff|ladeluft/.test(titleBlob) ||
    /motor|ansaug|abgasanlage|downpipe|turbo|kat|auspuff/.test(text)
  ) {
    category = "MOTOR_ABGAS_ANSAUGUNG";
  }

  return {
    title: title === UNKNOWN_PART_TITLE ? "Gutachten / ABE" : title,
    category,
    documentKind,
  };
}

export function resolveVaultReviewDefaults(input: {
  classification: VaultClassificationHint | null;
  fileName: string;
  embeddedHint: VaultClassificationHint | null;
}): VaultClassificationHint {
  const llm = input.classification;
  const embedded = input.embeddedHint;
  const fromFile = suggestTitleFromFileName(input.fileName);

  const documentKind = llm?.documentKind ?? embedded?.documentKind ?? null;
  const category =
    llm?.category && llm.category !== "SONSTIGES"
      ? llm.category
      : embedded?.category ?? llm?.category ?? "SONSTIGES";

  let title = llm?.title?.trim() ?? embedded?.title?.trim() ?? "";
  if (!title || title === UNKNOWN_PART_TITLE) {
    title =
      fromFile ||
      (documentKind === "teilegutachten"
        ? "Teilegutachten"
        : documentKind === "einzelabnahme"
          ? "Einzelabnahme"
          : documentKind === "abe"
            ? "ABE"
            : embedded?.title?.trim() ||
              "Gutachten / ABE");
  }

  return {
    title: title.slice(0, 160),
    category,
    documentKind,
  };
}

function suggestTitleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  if (base.length < 3) return "";
  if (/^(scan|document|dokument|upload|file|pdf|img|image|\d+)$/i.test(base)) {
    return "";
  }
  return base.slice(0, 160);
}
