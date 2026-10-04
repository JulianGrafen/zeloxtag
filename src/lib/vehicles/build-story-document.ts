import { isManualEntryMarker } from "@/lib/documents/manual-entries";
import { documentMediaKind } from "@/lib/documents/viewable-url";
import type { Document } from "@/types/database";

type BuildStoryDocShape = Pick<
  Document,
  "invoice_number" | "category" | "file_url" | "show_on_build_story"
>;

function isTuningLikeCategory(category: string | null | undefined): boolean {
  const raw = (category ?? "").trim().toLowerCase();
  if (!raw || raw === "service") return false;
  if (raw === "tuning") return true;
  return /tuning|umbau/.test(raw);
}

/** Matches `list_public_build_story` document filters (image manual umbauten). */
export function isBuildStoryEligibleDocument(
  doc: BuildStoryDocShape,
): boolean {
  if (!isManualEntryMarker(doc.invoice_number)) return false;
  if (!isTuningLikeCategory(doc.category)) return false;
  const fileUrl = doc.file_url?.trim() ?? "";
  if (!fileUrl || fileUrl.startsWith("manual://") || fileUrl.startsWith("mock://")) {
    return false;
  }
  return documentMediaKind(fileUrl) === "image";
}

export function isPublicBuildStoryDocument(doc: BuildStoryDocShape): boolean {
  return doc.show_on_build_story === true && isBuildStoryEligibleDocument(doc);
}
