/**
 * Shared pdf.js open helpers — many official PDFs (e.g. KBA ABE) use encryption
 * with an empty user password; retry once before failing.
 */

export type PdfJsGetDocument = (src: Record<string, unknown>) => {
  promise: Promise<unknown>;
};

export function pdfJsDocumentParams(data: Uint8Array): Record<string, unknown> {
  return {
    data,
    useSystemFonts: true,
    disableFontFace: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: 0,
  };
}

export function isPdfJsPasswordError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { name?: string; code?: number; message?: string };
  if (record.name === "PasswordException") return true;
  if (record.code === 1 || record.code === 2) return true;
  return /password|encrypt/i.test(record.message ?? "");
}

export async function openPdfJsDocument<T>(
  getDocument: PdfJsGetDocument,
  bytes: Buffer | Uint8Array,
): Promise<T> {
  const data = bytes instanceof Buffer ? new Uint8Array(bytes) : bytes;
  const base = pdfJsDocumentParams(data);
  try {
    return (await getDocument(base).promise) as T;
  } catch (error) {
    if (!isPdfJsPasswordError(error)) throw error;
    return (await getDocument({ ...base, password: "" }).promise) as T;
  }
}
