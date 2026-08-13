import type { JsonSchemaDefinition } from "@/services/invoice/interfaces";

/** OpenAI strict JSON schema for hybrid markdown invoice parse. */
export const HYBRID_INVOICE_JSON_SCHEMA: JsonSchemaDefinition = {
  name: "hybrid_parsed_invoice",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "vendor_name",
      "invoice_number",
      "invoice_date",
      "vehicle",
      "totals",
      "line_items",
    ],
    properties: {
      vendor_name: { type: ["string", "null"] },
      invoice_number: { type: ["string", "null"] },
      invoice_date: {
        type: ["string", "null"],
        description: "Invoice date as YYYY-MM-DD",
      },
      vehicle: {
        type: "object",
        additionalProperties: false,
        required: ["vin", "hsn_tsn", "license_plate", "mileage"],
        properties: {
          vin: { type: ["string", "null"] },
          hsn_tsn: { type: ["string", "null"] },
          license_plate: { type: ["string", "null"] },
          mileage: { type: ["number", "null"] },
        },
      },
      totals: {
        type: "object",
        additionalProperties: false,
        required: ["net_amount", "vat_amount", "gross_amount"],
        properties: {
          net_amount: { type: ["number", "null"] },
          vat_amount: { type: ["number", "null"] },
          gross_amount: { type: ["number", "null"] },
        },
      },
      line_items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["description", "quantity", "unit_price", "total_price"],
          properties: {
            description: { type: "string" },
            // null when the Menge cell is empty (e.g. multi-line continuation rows)
            quantity: { type: ["number", "null"] },
            unit_price: { type: ["number", "null"] },
            // null when the Ges.-Preis cell is empty but the row is otherwise real
            total_price: { type: ["number", "null"] },
          },
        },
      },
    },
  },
};
