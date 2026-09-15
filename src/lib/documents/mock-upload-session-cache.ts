const sessionKey = (documentId: string) => `zt-mock-file:${documentId}`;

/** Persist scanned bytes for mock uploads (same browser session only). */
export function cacheMockUploadFileInSession(
  documentId: string,
  file: File,
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof sessionStorage === "undefined") {
      resolve();
      return;
    }
    if (file.size > 4_500_000) {
      resolve();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        sessionStorage.setItem(sessionKey(documentId), String(reader.result ?? ""));
      } catch {
        // sessionStorage quota
      }
      resolve();
    };
    reader.onerror = () => resolve();
    reader.readAsDataURL(file);
  });
}

export function readMockUploadFileFromSession(
  documentId: string,
): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const value = sessionStorage.getItem(sessionKey(documentId));
  return value?.trim() ? value : null;
}
