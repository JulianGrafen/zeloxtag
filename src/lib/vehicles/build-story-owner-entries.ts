import {
  isBuildStoryEligibleDocument,
  isPublicBuildStoryDocument,
} from "@/lib/vehicles/build-story-document";
import {
  resolveBuildStorySubtitle,
  type BuildStoryEntry,
} from "@/lib/vehicles/build-story-map";
import { ownerShowcaseFileApiPath } from "@/lib/share/share-card-owner-showcase-file-url";
import type { Document } from "@/types/database";

export function mapOwnerBuildStoryEntry(
  vehicleId: string,
  doc: Document,
): BuildStoryEntry | null {
  if (!isBuildStoryEligibleDocument(doc)) return null;

  const title = doc.title?.trim();
  const date = (doc.date ?? doc.created_at)?.trim();
  const fileUrl = doc.file_url?.trim();
  if (!title || !date || !fileUrl) return null;

  const mileageKm =
    doc.mileage_km != null && Number.isFinite(doc.mileage_km)
      ? Math.max(0, Math.floor(doc.mileage_km))
      : null;

  return {
    id: doc.id,
    title: title.slice(0, 200),
    date,
    mileageKm,
    imageSrc: ownerShowcaseFileApiPath(vehicleId, fileUrl, 960),
    subtitle: resolveBuildStorySubtitle(doc.vendor),
  };
}

export function listOwnerBuildStoryChronikDocuments(
  documents: Document[],
): Document[] {
  return documents
    .filter((doc) => isPublicBuildStoryDocument(doc))
    .sort((a, b) =>
      (b.date ?? b.created_at).localeCompare(a.date ?? a.created_at),
    );
}

export function listOwnerBuildStoryPreviewEntries(
  vehicleId: string,
  documents: Document[],
  limit = 3,
): BuildStoryEntry[] {
  const entries: BuildStoryEntry[] = [];
  for (const doc of listOwnerBuildStoryChronikDocuments(documents)) {
    const mapped = mapOwnerBuildStoryEntry(vehicleId, doc);
    if (mapped) entries.push(mapped);
    if (entries.length >= limit) break;
  }
  return entries;
}

export function countBuildStoryEligibleDocuments(documents: Document[]): number {
  return documents.filter((doc) => isBuildStoryEligibleDocument(doc)).length;
}

export function countBuildStoryChronikDocuments(documents: Document[]): number {
  return documents.filter((doc) => isPublicBuildStoryDocument(doc)).length;
}
