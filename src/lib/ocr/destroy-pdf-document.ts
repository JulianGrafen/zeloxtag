import type { PDFDocumentProxy } from "pdfjs-dist";

/** Release pdf.js worker threads and document memory (pdfjs-dist v6+). */
export async function destroyPdfDocument(doc: PDFDocumentProxy): Promise<void> {
  try {
    await doc.loadingTask.destroy();
  } catch {
    // Best-effort teardown during client OCR and upload flows.
  }
}
