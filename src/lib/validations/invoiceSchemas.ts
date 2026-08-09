import { z } from "zod";

/**
 * Raw LLM line-item row — price/quantity fields are strings only so German
 * formats like "141,46 €" never fail numeric Zod coercion.
 */
export const LlmLineItemSchema = z.object({
  label: z.string().min(1),
  menge: z.string().nullable().optional(),
  einzelpreis: z.string().nullable().optional(),
  gesamtpreis: z.string().nullable().optional(),
});

export type LlmRawLineItem = z.infer<typeof LlmLineItemSchema>;
