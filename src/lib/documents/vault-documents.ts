import type { Document } from "@/types/database";
import {
  isVaultCategory,
  VAULT_CATEGORY_LABELS,
  VAULT_DOCUMENT_TYPE_MARKER,
  type VaultCategory,
} from "@/lib/validations/vaultClassificationSchema";

export function isVaultDocument(document: Document): boolean {
  return (
    document.category === VAULT_DOCUMENT_TYPE_MARKER ||
    document.approval_fields?.kind === "vault"
  );
}

export function resolveVaultCategory(document: Document): VaultCategory | null {
  if (document.approval_fields?.kind === "vault") {
    return document.approval_fields.data.category;
  }
  if (isVaultCategory(document.part_category)) {
    return document.part_category;
  }
  return null;
}

export function vaultCategoryLabel(document: Document): string | null {
  const category = resolveVaultCategory(document);
  return category ? VAULT_CATEGORY_LABELS[category] : null;
}

/** Filter chips for the ABE/Tresor list — short labels for mobile. */
export const VAULT_FILTER_CHIPS: Array<{
  id: VaultCategory | "all";
  label: string;
}> = [
  { id: "all", label: "Alle" },
  { id: "FAHRWERK", label: "Fahrwerk" },
  { id: "RÄDER_FELGEN", label: "Felgen" },
  { id: "AERODYNAMIK_KAROSSERIE", label: "Karosserie" },
  { id: "MOTOR_ABGAS_ANSAUGUNG", label: "Auspuff" },
  { id: "SONSTIGES", label: "Sonstiges" },
];

export function filterDocumentsByVaultCategory(
  documents: Document[],
  categoryId: VaultCategory | "all",
): Document[] {
  if (categoryId === "all") return documents;
  return documents.filter(
    (doc) => resolveVaultCategory(doc) === categoryId,
  );
}
