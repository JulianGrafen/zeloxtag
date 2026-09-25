import { renderToBuffer } from "@react-pdf/renderer";

import { ExposePdfDocument } from "@/components/pdf/ExposePdfDocument";
import { registerExposePdfFonts } from "@/lib/vehicles/expose-pdf/register-expose-fonts";
import type { ExposePdfData } from "@/lib/vehicles/expose-pdf/types";

/** Server-side PDF buffer generation for API streaming. */
export async function renderExposePdfBuffer(data: ExposePdfData): Promise<Buffer> {
  registerExposePdfFonts();
  const buffer = await renderToBuffer(<ExposePdfDocument data={data} />);
  return Buffer.from(buffer);
}
