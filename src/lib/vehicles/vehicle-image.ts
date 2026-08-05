/**
 * Map claimed vehicle → side-profile cutout for the dashboard roll-in.
 * Preference: owner-uploaded silhouette → known-model catalog → SVG fallback.
 */

export type VehicleImageMatch = {
  src: string;
  alt: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Resolve a transparent side-profile asset.
 * Returns undefined → dashboard falls back to generic SVG silhouette.
 */
export function resolveVehicleImage(input: {
  make: string;
  model: string;
  silhouetteImageUrl?: string | null;
}): VehicleImageMatch | undefined {
  const uploaded = input.silhouetteImageUrl?.trim();
  if (uploaded) {
    return {
      src: uploaded,
      alt: `${input.make} ${input.model}`.trim() || "Fahrzeug",
    };
  }

  const make = normalize(input.make);
  const model = normalize(input.model);
  const blob = `${make} ${model}`;

  // BMW 530d Touring (F11 side cutout + dashboard slide-in)
  if (/\b530d\b/.test(blob) || (/\bbmw\b/.test(blob) && /\b530\b/.test(blob))) {
    return {
      src: "/vehicles/bmw-530d.png",
      alt: "BMW 530d Touring",
    };
  }

  // Mazda RX-8
  if (/\brx\s*8\b/.test(blob) || (/\bmazda\b/.test(blob) && /\brx\b/.test(blob))) {
    return {
      src: "/vehicles/rx8.png",
      alt: "Mazda RX-8",
    };
  }

  // BMW M3 F82 (existing asset)
  if (/\bm3\b/.test(blob) && (/\bf82\b/.test(blob) || /\bbmw\b/.test(blob))) {
    return {
      src: "/vehicles/m3-f82-transparent.png",
      alt: "BMW M3",
    };
  }

  // Mercedes-AMG C63 W205 (existing asset)
  if (/\bc\s*63\b/.test(blob) || /\bc63\b/.test(blob)) {
    return {
      src: "/vehicles/c63-w205.png",
      alt: "Mercedes-AMG C 63",
    };
  }

  return undefined;
}
