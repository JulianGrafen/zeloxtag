import { z } from "zod";

export const vehicleRoastResultSchema = z.object({
  punchline: z.string().trim().min(12).max(320),
});

export type VehicleRoastResult = z.infer<typeof vehicleRoastResultSchema>;

export const VEHICLE_ROAST_JSON_SCHEMA = {
  name: "vehicle_build_roast",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["punchline"],
    properties: {
      punchline: { type: "string" },
    },
  },
} as const;

function normalizeRoastRaw(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const root = value as Record<string, unknown>;

  if (typeof root.punchline === "string" && root.punchline.trim()) {
    return { punchline: root.punchline.trim() };
  }

  if (Array.isArray(root.punchlines)) {
    const first = root.punchlines.find(
      (line) => typeof line === "string" && line.trim().length >= 12,
    );
    if (typeof first === "string") return { punchline: first.trim() };
  }

  if (typeof root.verdict === "string" && root.verdict.trim().length >= 12) {
    return { punchline: root.verdict.trim() };
  }

  if (typeof root.roast_title === "string" && root.roast_title.trim().length >= 12) {
    return { punchline: root.roast_title.trim() };
  }

  return value;
}

export function parseVehicleRoastResult(value: unknown): VehicleRoastResult | null {
  const normalized = normalizeRoastRaw(value);
  const parsed = vehicleRoastResultSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}
