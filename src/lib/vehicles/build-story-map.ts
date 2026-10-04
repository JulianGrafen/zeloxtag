import { OIL_CHANGE_SELF_WORKSHOP_LABEL } from "@/lib/documents/oil-changes";
import { documentMediaKind } from "@/lib/documents/viewable-url";

export type PublicBuildStoryRow = {
  id: string;
  title: string;
  date: string;
  mileage_km: number | null;
  file_url: string;
  vendor: string | null;
};

export type BuildStoryEntry = {
  id: string;
  title: string;
  date: string;
  mileageKm: number | null;
  imageSrc: string;
  subtitle: string | null;
};

export function publicBuildStoryImageProxyUrl(
  vehicleId: string,
  fileUrl: string,
): string | null {
  const trimmed = fileUrl.trim();
  if (
    !trimmed ||
    trimmed.startsWith("mock://") ||
    trimmed.startsWith("manual://")
  ) {
    return null;
  }
  if (documentMediaKind(trimmed) !== "image") return null;
  const params = new URLSearchParams({ src: trimmed });
  return `/api/public/vehicle/${vehicleId}/file?${params.toString()}`;
}

export function resolveBuildStorySubtitle(
  vendor: string | null | undefined,
): string | null {
  const trimmed = vendor?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed === OIL_CHANGE_SELF_WORKSHOP_LABEL) {
    return "Selbst gemacht";
  }
  return trimmed.slice(0, 120);
}

export function mapPublicBuildStoryRow(
  vehicleId: string,
  row: PublicBuildStoryRow,
): BuildStoryEntry | null {
  const id = row.id?.trim();
  const title = row.title?.trim();
  const date = row.date?.trim();
  if (!id || !title || !date) return null;

  const imageSrc = publicBuildStoryImageProxyUrl(vehicleId, row.file_url);
  if (!imageSrc) return null;

  const mileageKm =
    row.mileage_km != null && Number.isFinite(row.mileage_km)
      ? Math.max(0, Math.floor(row.mileage_km))
      : null;

  return {
    id,
    title: title.slice(0, 200),
    date,
    mileageKm,
    imageSrc,
    subtitle: resolveBuildStorySubtitle(row.vendor),
  };
}
