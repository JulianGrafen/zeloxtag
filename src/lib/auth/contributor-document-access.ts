import type { Document } from "@/types/database";

/**
 * Filter admin-loaded documents for Schrauber sessions.
 * Owners see everything; guests should not call this with write access.
 */
export function filterDocumentsForContributorAccess(
  documents: Document[],
  options: {
    isOwner: boolean;
    isContributor: boolean;
    canReadHistory: boolean;
    sessionUserId: string | null;
  },
): Document[] {
  if (options.isOwner || !options.isContributor) {
    return documents;
  }

  const invoices = documents.filter((doc) => doc.type === "invoice");

  if (options.canReadHistory) {
    return invoices;
  }

  if (!options.sessionUserId) {
    return [];
  }

  return invoices.filter((doc) => doc.created_by === options.sessionUserId);
}
