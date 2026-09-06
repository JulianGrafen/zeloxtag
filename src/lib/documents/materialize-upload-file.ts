/**
 * Read a browser File/Blob into an in-memory File before multipart upload.
 * Mobile pickers sometimes expose handles that fetch/FormData cannot replay.
 */

export class MaterializeUploadFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaterializeUploadFileError";
  }
}

export type MaterializeUploadFileOptions = {
  fallbackName?: string;
  fallbackMime?: string;
};

export async function materializeUploadFile(
  file: File | Blob,
  options?: MaterializeUploadFileOptions,
): Promise<File> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength < 32) {
    throw new MaterializeUploadFileError(
      "Datei ist leer — bitte erneut auswählen.",
    );
  }

  const named = file as File & { name?: string };
  const name =
    typeof named.name === "string" && named.name.trim()
      ? named.name.trim()
      : (options?.fallbackName ?? "upload.bin");
  const type =
    (typeof file.type === "string" && file.type.trim()) ||
    options?.fallbackMime ||
    "application/octet-stream";

  return new File([bytes], name, {
    type,
    lastModified: Date.now(),
  });
}
