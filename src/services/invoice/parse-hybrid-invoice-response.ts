import { z } from "zod";

import type { ParsedInvoiceDraft } from "@/types/invoice";
import { stripHtmlTags } from "@/lib/ocr/normalize-ocr-markdown";
import { signedInvoiceLineAmount } from "@/lib/ocr/text-parse-schema";

function sanitizeTextField(value: string | null | undefined): string | null {
  if (value == null) return null;
  const cleaned = stripHtmlTags(value).replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const hybridInvoiceLlmResponseSchema = z.object({
  vendor_name: z.string().trim().nullable(),
  invoice_number: z.string().trim().nullable(),
  invoice_date: isoDateSchema,
  vehicle: z.object({
    vin: z.string().trim().nullable(),
    hsn_tsn: z.string().trim().nullable(),
    license_plate: z.string().trim().nullable(),
    mileage: z.number().finite().nullable(),
  }),
  totals: z.object({
    net_amount: z.number().finite().nullable(),
    vat_amount: z.number().finite().nullable(),
    gross_amount: z.number().finite().nullable(),
  }),
  line_items: z.array(
    z.object({
      description: z.string().trim().min(1),
      // null when the Menge cell is empty
      quantity: z.number().finite().nullable(),
      unit_price: z.number().finite().nullable(),
      // null when the Ges.-Preis cell is empty but the row is otherwise real
      total_price: z.number().finite().nullable(),
    }),
  ),
});

export type HybridInvoiceLlmResponse = z.infer<
  typeof hybridInvoiceLlmResponseSchema
>;

export class HybridInvoiceParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HybridInvoiceParseError";
  }
}

function resolveGrossAmount(totals: HybridInvoiceLlmResponse["totals"]): number {
  if (totals.gross_amount != null) {
    return Math.round(totals.gross_amount * 100) / 100;
  }

  if (totals.net_amount != null && totals.vat_amount != null) {
    return Math.round((totals.net_amount + totals.vat_amount) * 100) / 100;
  }

  throw new HybridInvoiceParseError(
    "Missing gross_amount — could not derive from net_amount + vat_amount",
  );
}

/** Validate LLM JSON and map to domain draft (before math validator). */
export function parseHybridInvoiceLlmResponse(raw: unknown): ParsedInvoiceDraft {
  const parsed = hybridInvoiceLlmResponseSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((issue) => issue.message)
      .join("; ");
    throw new HybridInvoiceParseError(
      `LLM response failed schema validation: ${detail}`,
    );
  }

  const data = parsed.data;

  return {
    vendor_name: sanitizeTextField(data.vendor_name),
    invoice_number: sanitizeTextField(data.invoice_number),
    invoice_date: data.invoice_date,
    vehicle: {
      vin: sanitizeTextField(data.vehicle.vin),
      hsn_tsn: sanitizeTextField(data.vehicle.hsn_tsn),
      license_plate: sanitizeTextField(data.vehicle.license_plate),
      mileage:
        data.vehicle.mileage != null
          ? Math.round(data.vehicle.mileage)
          : null,
    },
    totals: {
      net_amount: data.totals.net_amount,
      vat_amount: data.totals.vat_amount,
      gross_amount: resolveGrossAmount(data.totals),
    },
    line_items: data.line_items.flatMap((item) => {
      // Derive total from qty × unit_price when the Ges.-Preis cell was empty.
      const derivedTotal =
        item.total_price ??
        (item.quantity != null && item.unit_price != null
          ? Math.round(item.quantity * item.unit_price * 100) / 100
          : null);

      // Skip genuine rate-only rows (no Ges.-Preis AND no computable total).
      // Every other row is included — the layout pipeline corrects amounts later.
      if (derivedTotal == null) return [];

      const description =
        sanitizeTextField(item.description) ?? item.description.trim();

      return [
        {
          description,
          quantity: item.quantity ?? 1,
          unit_price: item.unit_price,
          total_price: signedInvoiceLineAmount(description, derivedTotal),
        },
      ];
    }),
  };
}
