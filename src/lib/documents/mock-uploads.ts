import { cookies } from "next/headers";

import type { Document } from "@/types/database";

import { parseApprovalFields } from "./approval-fields";
import { parseLineItems } from "./line-items";
import { parseAbeConditions, parseStringList } from "./string-list";
import { parseTechnicalSpecs } from "./technical-specs";

export const MOCK_UPLOADS_COOKIE = "zt_mock_uploads";

type MockUploadStore = Record<string, Document[]>;

/**
 * Persists mock document metadata (no file bytes) for local demo without Supabase.
 */
function normalizeDocument(document: Document): Document {
  return {
    ...document,
    vendor: typeof document.vendor === "string" ? document.vendor : null,
    category: typeof document.category === "string" ? document.category : null,
    line_items: parseLineItems(document.line_items),
    kba_number:
      typeof document.kba_number === "string" ? document.kba_number : null,
    vehicle_approvals: parseStringList(document.vehicle_approvals),
    authority:
      typeof document.authority === "string" ? document.authority : null,
    conditions: parseAbeConditions(document.conditions),
    part_category:
      typeof document.part_category === "string"
        ? document.part_category
        : null,
    notes: typeof document.notes === "string" ? document.notes : null,
    page_count:
      typeof document.page_count === "number" ? document.page_count : null,
    manufacturer:
      typeof document.manufacturer === "string"
        ? document.manufacturer
        : null,
    invoice_number:
      typeof document.invoice_number === "string"
        ? document.invoice_number
        : null,
    mileage_km:
      typeof document.mileage_km === "number" ? document.mileage_km : null,
    technical_specs: parseTechnicalSpecs(document.technical_specs),
    approval_fields: parseApprovalFields(document.approval_fields),
  };
}

export async function getMockUploadedDocuments(
  vehicleId: string,
): Promise<Document[]> {
  const store = await readStore();
  return (store[vehicleId] ?? []).map(normalizeDocument);
}

export async function appendMockUploadedDocument(
  document: Document,
): Promise<void> {
  const store = await readStore();
  const existing = store[document.vehicle_id] ?? [];
  store[document.vehicle_id] = [document, ...existing].slice(0, 40);
  await writeStore(store);
}

export async function removeMockUploadedDocument(
  vehicleId: string,
  documentId: string,
): Promise<boolean> {
  const store = await readStore();
  const existing = store[vehicleId] ?? [];
  const next = existing.filter((doc) => doc.id !== documentId);
  if (next.length === existing.length) return false;
  store[vehicleId] = next;
  await writeStore(store);
  return true;
}

async function writeStore(store: MockUploadStore): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_UPLOADS_COOKIE, JSON.stringify(store), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

async function readStore(): Promise<MockUploadStore> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MOCK_UPLOADS_COOKIE)?.value;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as MockUploadStore;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}
