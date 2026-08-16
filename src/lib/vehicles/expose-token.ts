import { randomUUID } from "node:crypto";
import { z } from "zod";

/** Public exposé URL token — UUID only, never a vehicle id. */
export const exposeTokenSchema = z.string().uuid();

export function generateExposeToken(): string {
  return randomUUID();
}

export function exposePublicPath(token: string): string {
  return `/expose/${token.trim()}`;
}

export function isValidExposeToken(value: string): boolean {
  return exposeTokenSchema.safeParse(value.trim()).success;
}
