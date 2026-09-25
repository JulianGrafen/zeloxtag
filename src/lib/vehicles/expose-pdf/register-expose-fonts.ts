import path from "node:path";

import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

function fontPath(packageName: string, fileName: string): string {
  return path.join(
    process.cwd(),
    "node_modules",
    `@fontsource/${packageName}`,
    "files",
    fileName,
  );
}

/** Register Poppins + Inter for server-side exposé PDF rendering. */
export function registerExposePdfFonts(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;

  Font.register({
    family: "ExposePoppins",
    src: fontPath("poppins", "poppins-latin-600-normal.woff"),
    fontWeight: "normal",
  });
  Font.register({
    family: "ExposePoppins-Bold",
    src: fontPath("poppins", "poppins-latin-700-normal.woff"),
    fontWeight: "bold",
  });
  Font.register({
    family: "ExposeInter",
    src: fontPath("inter", "inter-latin-400-normal.woff"),
    fontWeight: "normal",
  });
  Font.register({
    family: "ExposeInter-Medium",
    src: fontPath("inter", "inter-latin-500-normal.woff"),
    fontWeight: "medium",
  });
}
