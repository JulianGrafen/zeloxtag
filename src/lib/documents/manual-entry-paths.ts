import { revalidatePath } from "next/cache";

/** Revalidate surfaces that list or derive from manual vehicle entries. */
export function revalidateManualEntryPaths(
  tagUuid: string,
  documentId?: string,
): void {
  revalidatePath(`/v/${tagUuid}`);
  revalidatePath(`/v/${tagUuid}/eintrag`);
  revalidatePath(`/v/${tagUuid}/umbauten`);
  revalidatePath(`/v/${tagUuid}/service`);
  revalidatePath(`/v/${tagUuid}/dokumente`);
  revalidatePath(`/v/${tagUuid}/intervalle`);
  revalidatePath(`/v/${tagUuid}/historie`);
  if (documentId) {
    revalidatePath(`/v/${tagUuid}/dokumente/${documentId}`);
    revalidatePath(`/v/${tagUuid}/intervalle/${documentId}`);
  }
}
