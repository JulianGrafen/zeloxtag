import { z } from "zod";

export type ParseBodyFailure = {
  ok: false;
  error: string;
  issues: z.ZodIssue[];
};

export type ParseBodySuccess<T> = {
  ok: true;
  data: T;
};

/**
 * Strict Zod parse: unknown keys are rejected (prototype-pollution / mass-assignment guard).
 */
export function parseStrictBody<T extends z.ZodType>(
  schema: T,
  raw: unknown,
): ParseBodySuccess<z.infer<T>> | ParseBodyFailure {
  const strictSchema =
    schema instanceof z.ZodObject ? schema.strict() : schema;
  const result = strictSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: "Invalid request body.",
      issues: result.error.issues,
    };
  }
  return { ok: true, data: result.data as z.infer<T> };
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; json: unknown } | { ok: false; error: string }> {
  try {
    const json: unknown = await request.json();
    return { ok: true, json };
  } catch {
    return { ok: false, error: "Expected JSON body." };
  }
}
