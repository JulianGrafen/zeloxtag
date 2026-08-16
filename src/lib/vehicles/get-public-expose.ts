import "server-only";

import { cache } from "react";

import {
  DOCUMENT_EXPOSE_COLUMNS,
  VEHICLE_EXPOSE_COLUMNS,
} from "@/lib/documents/query-columns";
import { parseApprovalFields } from "@/lib/documents/approval-fields";
import { parseLineItems } from "@/lib/documents/line-items";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { MOCK_TAG_UUIDS, getMockTagScan } from "@/lib/tags/mock-tags";
import { withDefaultShowcaseFields } from "@/lib/vehicles/public-showcase-data";
import { parseVehicleTechSpecs } from "@/lib/vehicles/tech-specs";
import {
  mergeTimelineEvents,
  buildTimelineFromDocuments,
} from "@/services/timeline/TimelineService";
import { deriveTimelineEventsFromDocuments } from "@/services/timeline/derive-timeline-from-documents";
import {
  mapVehicleEventRowToTimelineEvent,
  TimelineEventSchema,
  VehicleEventRowSchema,
  type TimelineEvent,
} from "@/lib/validations/timelineSchema";
import type { Document, Vehicle } from "@/types/database";

import { buildExposeData, type ExposeData } from "./expose-data";
import { exposeTokenSchema } from "./expose-token";

function isMissingExposeColumnError(error: {
  message?: string;
  code?: string;
}): boolean {
  return (
    error.code === "PGRST204" ||
    Boolean(error.message?.includes("expose_token")) ||
    Boolean(error.message?.includes("is_expose_active"))
  );
}

function normalizeVehicle(value: unknown): Vehicle | null {
  if (!value || typeof value !== "object") return null;
  const vehicle = value as Vehicle;
  if (typeof vehicle.id !== "string" || typeof vehicle.make !== "string") {
    return null;
  }
  return withDefaultShowcaseFields({
    ...vehicle,
    user_id: "",
    model: typeof vehicle.model === "string" ? vehicle.model : "",
    year: typeof vehicle.year === "number" ? vehicle.year : null,
    vin: null,
    tech_specs: parseVehicleTechSpecs(vehicle.tech_specs),
    silhouette_image_url:
      typeof vehicle.silhouette_image_url === "string"
        ? vehicle.silhouette_image_url
        : null,
    expose_token: null,
    is_expose_active: vehicle.is_expose_active === true,
    created_at:
      typeof vehicle.created_at === "string" ? vehicle.created_at : "",
    updated_at:
      typeof vehicle.updated_at === "string" ? vehicle.updated_at : "",
  });
}

function normalizeExposeDocument(value: unknown): Document | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Document;
  if (typeof doc.id !== "string" || typeof doc.title !== "string") return null;

  const amountRaw = (doc as { amount?: unknown }).amount;
  const amount =
    typeof amountRaw === "number" && Number.isFinite(amountRaw)
      ? amountRaw
      : typeof amountRaw === "string"
        ? Number.parseFloat(amountRaw.replace(",", "."))
        : NaN;
  const mileageRaw = (doc as { mileage_km?: unknown }).mileage_km;
  const mileageKm =
    typeof mileageRaw === "number" && Number.isFinite(mileageRaw)
      ? Math.round(mileageRaw)
      : typeof mileageRaw === "string"
        ? Number.parseInt(mileageRaw.replace(/[^\d]/g, ""), 10)
        : NaN;

  return {
    ...doc,
    user_id: "",
    created_by: null,
    file_url: "",
    vendor: typeof doc.vendor === "string" ? doc.vendor : null,
    category: typeof doc.category === "string" ? doc.category : null,
    line_items: parseLineItems(doc.line_items),
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category:
      typeof doc.part_category === "string" ? doc.part_category : null,
    notes: null,
    page_count: null,
    manufacturer:
      typeof doc.manufacturer === "string" ? doc.manufacturer : null,
    invoice_number: null,
    amount: Number.isFinite(amount) ? amount : null,
    mileage_km: Number.isFinite(mileageKm) ? mileageKm : null,
    technical_specs: null,
    approval_fields: parseApprovalFields(doc.approval_fields),
    show_on_public_showcase: false,
  };
}

function parseStoredEvents(rows: unknown[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const raw of rows) {
    const row = VehicleEventRowSchema.safeParse(raw);
    if (!row.success) continue;
    const mapped = TimelineEventSchema.safeParse(
      mapVehicleEventRowToTimelineEvent(row.data),
    );
    if (mapped.success) events.push(mapped.data);
  }
  return events;
}

async function loadExposeDocuments(vehicleId: string): Promise<Document[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("documents")
    .select(DOCUMENT_EXPOSE_COLUMNS)
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load exposé documents: ${error.message}`);
  }

  return ((data as unknown[]) ?? [])
    .map(normalizeExposeDocument)
    .filter((doc): doc is Document => doc !== null);
}

async function loadExposeTimeline(
  vehicleId: string,
  documents: Document[],
): Promise<TimelineEvent[]> {
  if (!isSupabaseAdminConfigured()) {
    return buildTimelineFromDocuments(documents, "desc");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicle_events")
    .select(
      "id, vehicle_id, mileage, date, category, title, description, cost, document_id",
    )
    .eq("vehicle_id", vehicleId);

  if (error) {
    console.error(
      "[public-expose] vehicle_events fetch failed",
      error.message,
    );
    return buildTimelineFromDocuments(documents, "desc");
  }

  return mergeTimelineEvents(
    parseStoredEvents(data ?? []),
    deriveTimelineEventsFromDocuments(documents),
  );
}

async function loadVehicleByTokenAdmin(token: string): Promise<Vehicle | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .select(VEHICLE_EXPOSE_COLUMNS)
    .eq("expose_token", token)
    .eq("is_expose_active", true)
    .maybeSingle();

  if (error) {
    if (isMissingExposeColumnError(error)) {
      console.warn(
        "[public-expose] vehicles.expose_token missing — apply migration 00037_vehicle_expose_token.sql",
      );
      return null;
    }
    throw new Error(`Failed to resolve exposé token: ${error.message}`);
  }

  return data ? normalizeVehicle(data) : null;
}

async function loadVehicleByTokenRpc(token: string): Promise<Vehicle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "resolve_public_expose_by_token",
    { p_token: token },
  );

  if (error) {
    if (isMissingExposeColumnError(error)) return null;
    throw new Error(`Failed to resolve exposé token: ${error.message}`);
  }
  if (!data || typeof data !== "object") return null;
  const record = data as { vehicle?: unknown };
  return normalizeVehicle(record.vehicle);
}

/** Local demo dossier when Supabase is not configured. */
export const DEMO_EXPOSE_TOKEN = "00000000-0000-4000-8000-000000000001";

function buildDemoExpose(): ExposeData | null {
  const mock = getMockTagScan(MOCK_TAG_UUIDS.active);
  if (!mock?.vehicle) return null;
  const documents = mock.documents.map((doc) => ({
    ...doc,
    notes: null,
    conditions: null,
    file_url: "",
    invoice_number: null,
    user_id: "",
    created_by: null,
  }));
  return buildExposeData(
    mock.vehicle,
    documents,
    buildTimelineFromDocuments(documents, "desc"),
  );
}

async function getPublicExposeByTokenUncached(
  rawToken: string,
): Promise<ExposeData | null> {
  const parsed = exposeTokenSchema.safeParse(rawToken.trim());
  if (!parsed.success) return null;

  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return parsed.data === DEMO_EXPOSE_TOKEN ? buildDemoExpose() : null;
  }

  const vehicle =
    (await loadVehicleByTokenAdmin(parsed.data)) ??
    (await loadVehicleByTokenRpc(parsed.data));

  if (!vehicle || !vehicle.is_expose_active) return null;

  const documents = await loadExposeDocuments(vehicle.id);
  const timeline = await loadExposeTimeline(vehicle.id, documents);
  return buildExposeData(vehicle, documents, timeline);
}

/** Request-memoized — generateMetadata and the page share one lookup. */
export const getPublicExposeByToken = cache(getPublicExposeByTokenUncached);

export type OwnerExposeState = {
  exposeToken: string | null;
  isExposeActive: boolean;
};

/** Owner settings only — never call this on a public surface. */
export async function getOwnerExposeState(
  vehicleId: string,
): Promise<OwnerExposeState> {
  const empty: OwnerExposeState = { exposeToken: null, isExposeActive: false };
  const { isConfigured } = getSupabaseEnv();
  if (!isConfigured || !vehicleId.trim()) return empty;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("expose_token, is_expose_active")
    .eq("id", vehicleId.trim())
    .maybeSingle();

  if (error || !data) return empty;

  const token =
    typeof data.expose_token === "string" &&
    exposeTokenSchema.safeParse(data.expose_token).success
      ? data.expose_token
      : null;

  return {
    exposeToken: token,
    isExposeActive: data.is_expose_active === true,
  };
}
