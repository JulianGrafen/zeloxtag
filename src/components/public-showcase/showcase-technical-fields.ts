import type { PublicShowcaseProfile } from "@/lib/vehicles/public-showcase-data";

export type ShowcaseTechnicalField = {
  key: string;
  label: string;
  value: string;
};

export function buildShowcaseTechnicalFields(
  profile: PublicShowcaseProfile,
): ShowcaseTechnicalField[] {
  const fields: ShowcaseTechnicalField[] = [];

  if (profile.displacementCc != null) {
    fields.push({
      key: "displacement",
      label: "Hubraum",
      value: `${profile.displacementCc.toLocaleString("de-DE")} ccm`,
    });
  }
  if (profile.fuelType) {
    fields.push({
      key: "fuel",
      label: "Kraftstoff",
      value: profile.fuelType,
    });
  }
  if (profile.bodyType) {
    fields.push({
      key: "body",
      label: "Karosserie",
      value: profile.bodyType,
    });
  }
  if (profile.color) {
    fields.push({
      key: "color",
      label: "Farbe",
      value: profile.color,
    });
  }

  return fields;
}
