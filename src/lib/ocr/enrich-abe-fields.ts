/**
 * Fill missing ABE fields from OCR text heuristics (LLM-first, heuristic fallback).
 * Safe to run on server and in the browser.
 */

import {
  looksLikeAbeDocument,
  resolveAbeFields,
} from "./abe-from-text";
import { resolveAbePartIdentity } from "./part-from-text";
import {
  normalizeTextParseResult,
  type InvoiceTextParseResult,
} from "./text-parse-schema";

/**
 * Ensure Bauteil, Hersteller, KBA, Freigaben and Auflagen are populated when
 * the document is (or looks like) an ABE / Teilegutachten.
 */
export function enrichAbeFieldsFromText(
  fields: InvoiceTextParseResult,
  rawText: string,
): InvoiceTextParseResult {
  const text = rawText.trim();
  if (text.length < 8) return fields;

  const isAbe =
    fields.category === "abe" ||
    Boolean(fields.kbaNumber?.trim()) ||
    Boolean(fields.vehicleApprovals?.length) ||
    Boolean(fields.conditions?.length) ||
    looksLikeAbeDocument(text);

  if (!isAbe) return fields;

  const identity = resolveAbePartIdentity({
    structuredVendor: fields.vendor,
    structuredManufacturer: fields.manufacturer,
    rawText: text,
  });

  const abe = resolveAbeFields({
    structuredKba: fields.kbaNumber,
    structuredApprovals: fields.vehicleApprovals,
    structuredConditions: fields.conditions,
    rawText: text,
  });

  return normalizeTextParseResult({
    ...fields,
    category: "abe",
    vendor: identity.vendor ?? fields.vendor,
    manufacturer: identity.manufacturer ?? fields.manufacturer,
    summary: fields.summary ?? identity.vendor?.slice(0, 80) ?? null,
    kbaNumber: abe.kbaNumber,
    vehicleApprovals: abe.vehicleApprovals,
    conditions: abe.conditions,
    lineItems: null,
    invoiceNumber: null,
    mileageKm: null,
  });
}
