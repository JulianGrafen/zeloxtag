import { renderToBuffer } from "@react-pdf/renderer";

import { ExposePdfDocument } from "@/components/pdf/ExposePdfDocument";
import type { ExposePdfData } from "@/lib/vehicles/expose-pdf/types";

/** Server-side PDF buffer generation for API streaming. */
export async function renderExposePdfBuffer(data: ExposePdfData): Promise<Buffer> {
  const buffer = await renderToBuffer(<ExposePdfDocument data={data} />);
  return Buffer.from(buffer);
}
