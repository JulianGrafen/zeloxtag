import { jsPDF } from "jspdf";

import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  computeA4ContainLayout,
} from "./a4-layout";
import { compressImageForPdf } from "./compressImageForPdf";

/**
 * Build a multi-page A4 PDF from image files.
 * Each input image becomes one centered, aspect-preserving page on white A4.
 */
export async function generateA4PdfFromImages(
  imageFiles: File[],
): Promise<Blob> {
  if (imageFiles.length === 0) {
    throw new Error("Mindestens ein Bild wird für das PDF benötigt.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  for (let index = 0; index < imageFiles.length; index += 1) {
    if (index > 0) {
      pdf.addPage("a4", "portrait");
    }

    const compressed = await compressImageForPdf(imageFiles[index]);
    const layout = computeA4ContainLayout(
      compressed.widthPx,
      compressed.heightPx,
      A4_WIDTH_MM,
      A4_HEIGHT_MM,
    );

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, "F");
    pdf.addImage(
      compressed.dataUrl,
      "JPEG",
      layout.xMm,
      layout.yMm,
      layout.widthMm,
      layout.heightMm,
      undefined,
      "FAST",
    );
  }

  return pdf.output("blob");
}
