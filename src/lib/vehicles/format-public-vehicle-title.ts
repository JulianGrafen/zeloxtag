/** One-line vehicle name for public showcase, metadata, and labels. */
export function formatPublicVehicleTitle(
  make: string | null | undefined,
  model: string | null | undefined,
): string {
  const makeTrim = typeof make === "string" ? make.trim() : "";
  const modelTrim = typeof model === "string" ? model.trim() : "";

  if (!makeTrim && !modelTrim) return "";
  if (!makeTrim) return modelTrim;
  if (!modelTrim) return makeTrim;

  const makeLower = makeTrim.toLowerCase();
  const modelLower = modelTrim.toLowerCase();

  if (modelLower === makeLower) return makeTrim;
  if (
    modelLower.startsWith(`${makeLower} `) ||
    modelLower.startsWith(`${makeLower}-`)
  ) {
    return modelTrim;
  }

  return `${makeTrim} ${modelTrim}`;
}
