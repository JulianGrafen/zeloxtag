import { z } from "zod";

/**
 * Mileage-ordered Service & History Timeline events.
 * Source of truth for `vehicle_events` rows and document-derived milestones.
 */

export const TIMELINE_EVENT_CATEGORIES = [
  "oil_change",
  "repair",
  "inspection",
  "part_install",
  "tuev",
  "other",
] as const;

export type TimelineEventCategory = (typeof TIMELINE_EVENT_CATEGORIES)[number];

export const TIMELINE_CATEGORY_LABELS: Record<TimelineEventCategory, string> = {
  oil_change: "Ölwechsel",
  repair: "Reparatur",
  inspection: "Inspektion",
  part_install: "Teile / Umbau",
  tuev: "TÜV / HU",
  other: "Sonstiges",
};

/** Accept YYYY-MM-DD or ISO timestamps → calendar date. */
const isoDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
  return trimmed;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"));

export const TimelineEventSchema = z
  .object({
    id: z.string().trim().min(1),
    vehicleId: z.string().trim().min(1),
    mileage: z.number().int().nonnegative().max(9_999_999),
    date: isoDate,
    category: z.enum(TIMELINE_EVENT_CATEGORIES),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(4_000).nullable().optional(),
    cost: z.number().finite().nonnegative().nullable().optional(),
    documentId: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

/** Coerce PostgREST numeric strings → number. */
const nullableCost = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z.number().finite().nonnegative().nullable().optional());

/** DB row shape (snake_case) before mapping to TimelineEvent. */
export const VehicleEventRowSchema = z
  .object({
    id: z.string().trim().min(1),
    vehicle_id: z.string().trim().min(1),
    mileage: z.number().int().nonnegative().max(9_999_999),
    date: isoDate,
    category: z.enum(TIMELINE_EVENT_CATEGORIES),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(4_000).nullable().optional(),
    cost: nullableCost,
    document_id: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

export type VehicleEventRow = z.infer<typeof VehicleEventRowSchema>;

export function mapVehicleEventRowToTimelineEvent(
  row: VehicleEventRow,
): TimelineEvent {
  return TimelineEventSchema.parse({
    id: row.id,
    vehicleId: row.vehicle_id,
    mileage: row.mileage,
    date: row.date,
    category: row.category,
    title: row.title,
    description: row.description ?? null,
    cost: row.cost ?? null,
    documentId: row.document_id ?? null,
  });
}
