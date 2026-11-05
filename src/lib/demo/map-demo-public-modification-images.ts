import { hasStoredModificationImage } from "@/lib/vehicles/build-story-document";
import type { PublicModification } from "@/lib/vehicles/public-showcase-data";
import type { Document } from "@/types/database";

/** Mock partner demos: serve `/demo/…` umbau photos directly (no Supabase file API). */
export function mapDemoPublicModificationImages(
  modifications: PublicModification[],
  documents: readonly Pick<Document, "id" | "file_url">[],
): PublicModification[] {
  return modifications.map((mod) => {
    const doc = documents.find((entry) => entry.id === mod.id);
    const fileUrl = doc?.file_url?.trim() ?? "";
    if (
      !doc ||
      !fileUrl.startsWith("/demo/") ||
      !hasStoredModificationImage(doc)
    ) {
      return mod;
    }
    return { ...mod, imageSrc: fileUrl };
  });
}
