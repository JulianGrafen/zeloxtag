import type { ApprovalFieldKind } from "@/lib/documents/approval-fields";
import type { Document } from "@/types/database";

export const ABE_FAMILY_KINDS = [
  "abe",
  "teilegutachten",
  "einzelabnahme",
  "pruefung192",
] as const;

export type AbeFamilyKind = (typeof ABE_FAMILY_KINDS)[number];

const ABE_FAMILY_KIND_SET = new Set<ApprovalFieldKind>(ABE_FAMILY_KINDS);

/**
 * True for plain ABE, Teilegutachten (§19.3) and Einzelabnahme (§21).
 * Excludes EG-BE and other misclassified rows on `type = abe`.
 */
export function isAbeFamilyDocument(document: Document): boolean {
  return resolveAbeFamilyKind(document) !== null;
}

/** Map stored document → ABE / Teilegutachten / Einzelabnahme. */
export function resolveAbeFamilyKind(
  document: Document,
): AbeFamilyKind | null {
  if (document.type !== "abe") return null;

  const kind = document.approval_fields?.kind;
  if (kind && !ABE_FAMILY_KIND_SET.has(kind)) return null;
  if (kind === "teilegutachten" || kind === "einzelabnahme" || kind === "pruefung192") {
    return kind;
  }
  return "abe";
}

export function filterAbeFamilyDocuments(documents: Document[]): Document[] {
  return documents.filter(isAbeFamilyDocument);
}

export function filterAbeFamilyDocumentsByKind(
  documents: Document[],
  kind: AbeFamilyKind | "all",
): Document[] {
  const family = filterAbeFamilyDocuments(documents);
  if (kind === "all") return family;
  return family.filter((doc) => resolveAbeFamilyKind(doc) === kind);
}
