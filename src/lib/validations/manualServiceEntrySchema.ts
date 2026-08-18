import { z } from "zod";

import {
  MANUAL_SERVICE_ENTRY_LABELS,
  MANUAL_SERVICE_ENTRY_TYPES,
  type ManualServiceEntryType,
} from "@/lib/documents/manual-entries";

export { MANUAL_SERVICE_ENTRY_TYPES, MANUAL_SERVICE_ENTRY_LABELS };
export type { ManualServiceEntryType };

export type ManualServiceEntryInput = {
  vehicleId: string;
  tagUuid: string;
  serviceType: ManualServiceEntryType;
  date: string;
  mileageKm: number;
  amount?: number | null;
  details?: string | null;
  vendor?: string | null;
  notes?: string | null;
};

export const manualServiceEntryFormSchema = z.object({
  vehicleId: z.string().uuid(),
  tagUuid: z.string().trim().min(1).max(128),
  serviceType: z.enum(MANUAL_SERVICE_ENTRY_TYPES),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ungültig."),
  mileageKm: z
    .string()
    .trim()
    .min(1, "Kilometerstand fehlt.")
    .transform((raw) => raw.replace(/[^\d]/g, ""))
    .refine((digits) => digits.length > 0, "Kilometerstand fehlt.")
    .transform((digits) => Number.parseInt(digits, 10))
    .refine(
      (value) => Number.isFinite(value) && value >= 0 && value <= 9_999_999,
      "Kilometerstand ungültig.",
    ),
  amount: z.string().trim().max(32).optional().default(""),
  details: z.string().trim().max(200).optional().default(""),
  vendor: z.string().trim().max(160).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
});

export type ManualServiceEntryFormValues = z.infer<
  typeof manualServiceEntryFormSchema
>;
