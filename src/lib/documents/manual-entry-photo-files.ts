import {
  MANUAL_ENTRY_MAX_PHOTOS,
  manualEntryPhotoLimit,
  parseManualEntryCategory,
} from "@/lib/documents/manual-entries";

function normalizeManualUploadFile(
  value: unknown,
  fallbackName: string,
): File | null {
  if (value instanceof File && value.size > 0) {
    if (value.name?.trim()) return value;
    return new File([value], fallbackName, {
      type: value.type || "application/octet-stream",
    });
  }
  if (typeof Blob !== "undefined" && value instanceof Blob && value.size > 0) {
    return new File([value], fallbackName, {
      type: value.type || "application/octet-stream",
    });
  }
  return null;
}

export function collectManualEntryPhotoFiles(
  formData: FormData,
  maxPhotos = MANUAL_ENTRY_MAX_PHOTOS,
): File[] {
  const files: File[] = [];
  let index = 0;
  for (const value of formData.getAll("photos")) {
    const file = normalizeManualUploadFile(value, `manual-photo-${index + 1}.jpg`);
    if (file) {
      files.push(file);
      index += 1;
    }
  }
  const single = formData.get("photo");
  const singleFile = normalizeManualUploadFile(single, "manual-photo.jpg");
  if (singleFile) {
    files.push(singleFile);
  }
  return files.slice(0, maxPhotos);
}

export function collectManualEntryPhotoFilesFromForm(
  formData: FormData,
): File[] {
  const categoryRaw = String(formData.get("category") ?? "");
  const category = parseManualEntryCategory(categoryRaw) ?? "service";
  return collectManualEntryPhotoFiles(
    formData,
    manualEntryPhotoLimit(category),
  );
}
