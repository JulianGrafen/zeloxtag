import { MANUAL_ENTRY_MARKER } from "@/lib/documents/manual-entries";
import {
  BUILD_DNA_SCHEMA_VERSION,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { Document, Tag, TagScanResult, Vehicle } from "@/types/database";

import { DEMO_ENGINE_SOUND_URL } from "./demo-assets";

/** QR / tag uuid — keep in sync with `MOCK_TAG_UUIDS.rwEdition` in mock-tags. */
export const DEMO_RW_EDITION_TAG_UUID = "demo-rw-edition";

export const MOCK_RW_EDITION_VEHICLE_ID = "veh_demo_mini_f56";
export const DEMO_RW_EDITION_INSTAGRAM_HANDLE = "rw_edition";
export const DEMO_RW_EDITION_PARTNER_WEB_URL = "https://www.rw-edition.de/home/";
export const DEMO_RW_EDITION_SHOWCASE_IMAGE = "/demo/rw-edition-showcase.jpg";
export const DEMO_RW_EDITION_GALLERY_REAR_IMAGE = "/demo/rw-edition-rear.jpg";
export const DEMO_RW_EDITION_GALLERY_WORKSHOP_IMAGE =
  "/demo/rw-edition-workshop.jpg";
export const DEMO_RW_EDITION_GALLERY_EXHAUST_IMAGE =
  "/demo/rw-edition-exhaust.jpg";
export const DEMO_RW_EDITION_LOGO_SRC = "/demo/rw-edition-logo.png";
export const DEMO_RW_EDITION_DYNO_CHART_URL =
  "/demo/rw-edition-leistungsdiagramm.jpg";

/** Messwerte JCW F56 · RW Edition (Prüfstand 15.10.2026, RW Abstimmung). */
export const DEMO_RW_EDITION_STAGE2 = {
  powerPs: 301,
  torqueNm: 428,
  accel0To100Sec: 4.9,
  accel100To200Sec: 13.1,
} as const;

export const DEMO_RW_EDITION_STOCK = {
  powerPs: 231,
  torqueNm: 320,
  accel0To100Sec: 6.1,
  accel100To200Sec: 16.8,
} as const;

const RW_EDITION_SPEC_NOTES =
  "Dieser MINI John Cooper Works F56 hat von RW Edition eine ordentliche Portion Fahrspaß bekommen — 301 PS und 428 Nm am Prüfstand (RW Abstimmung). " +
  "Durchgeführt: HJS Downpipe mit Sportkatalysator, neue Zündkerzen, Ölwechsel inkl. Ölfilter sowie individuelle, saubere und effiziente Motorabstimmung.";

export const DEMO_RW_EDITION_BUILD_DNA: ShowcaseBuildDna = {
  version: BUILD_DNA_SCHEMA_VERSION,
  archetype: "OEM+",
  punchline:
    "301 PS & 428 Nm — ordentliche Portion Fahrspaß im John Cooper Works.",
  radar: [
    { category: "Leistung", score: 82 },
    { category: "Fahrwerk", score: 72 },
    { category: "Optik", score: 76 },
    { category: "Haltbarkeit", score: 68 },
    { category: "Akustik", score: 72 },
    { category: "Straßenlage", score: 74 },
  ],
};

const now = "2026-03-25T10:00:00.000Z";

const rwEditionVehicle: Vehicle = {
  id: MOCK_RW_EDITION_VEHICLE_ID,
  user_id: "user_demo_rw_edition",
  make: "MINI",
  model: "John Cooper Works F56",
  year: 2019,
  vin: "WMWXM710X02K12345",
  tech_specs: {
    powerPs: DEMO_RW_EDITION_STAGE2.powerPs,
    powerKw: 221,
    torqueNm: DEMO_RW_EDITION_STAGE2.torqueNm,
    accel0To100Sec: DEMO_RW_EDITION_STAGE2.accel0To100Sec,
    accel100To200Sec: DEMO_RW_EDITION_STAGE2.accel100To200Sec,
    vmaxKmh: 235,
    engine: "2.0 L Turbo · RW Edition Motorabstimmung",
    drivetrain: "Frontantrieb",
    transmission: "6-Gang Schaltgetriebe",
    fuelType: "Benzin",
    buildPersonalityTags: ["daily", "oem_plus", "stance"],
    instagramHandle: DEMO_RW_EDITION_INSTAGRAM_HANDLE,
    notes: RW_EDITION_SPEC_NOTES,
  },
  silhouette_image_url: null,
  sound_url: DEMO_ENGINE_SOUND_URL,
  is_public: true,
  hide_financials: true,
  public_slug: "rw-edition-jcw-f56",
  showcase_swipe_opt_in: false,
  is_story_public: false,
  expose_token: null,
  is_expose_active: false,
  showcase_build_dna: null,
  showcase_build_dna_fingerprint: null,
  showcase_build_dna_updated_at: null,
  created_at: now,
  updated_at: now,
};

const publicMods: Array<Pick<Document, "id" | "title" | "vendor" | "date">> = [
  {
    id: "doc_rw_hjs_downpipe",
    title: "HJS Downpipe mit Sportkatalysator",
    vendor: "HJS Tuning",
    date: "2026-01-18",
  },
  {
    id: "doc_rw_spark_plugs",
    title: "Neue Zündkerzen",
    vendor: "RW Edition",
    date: "2026-01-18",
  },
  {
    id: "doc_rw_oil_service",
    title: "Ölwechsel inkl. Ölfilter",
    vendor: "RW Edition",
    date: "2026-01-18",
  },
  {
    id: "doc_rw_engine_tune",
    title: "Individuelle, saubere und effiziente Motorabstimmung",
    vendor: "RW Edition",
    date: "2026-01-18",
  },
];

function buildModDocument(
  mod: Pick<Document, "id" | "title" | "vendor" | "date">,
): Document {
  return {
    id: mod.id,
    vehicle_id: rwEditionVehicle.id,
    user_id: rwEditionVehicle.user_id,
    created_by: rwEditionVehicle.user_id,
    title: mod.title,
    type: "invoice",
    file_url: `manual://umbau/${mod.id}`,
    vendor: mod.vendor,
    category: "tuning",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: "Umbau",
    notes: null,
    page_count: null,
    manufacturer: mod.vendor,
    invoice_number: MANUAL_ENTRY_MARKER,
    mileage_km: 54_200,
    technical_specs: null,
    approval_fields: null,
    amount: null,
    date: mod.date,
    show_on_public_showcase: true,
    created_at: mod.date ? `${mod.date}T10:00:00.000Z` : now,
  };
}

const privateInvoiceDocuments: Document[] = [
  {
    id: "doc_rw_invoice_stage2",
    vehicle_id: rwEditionVehicle.id,
    user_id: rwEditionVehicle.user_id,
    created_by: rwEditionVehicle.user_id,
    title: "Rechnung Motorabstimmung & Service",
    type: "invoice",
    file_url: "/demo/invoice-oil.pdf",
    vendor: "RW Edition",
    category: "tuning",
    line_items: null,
    kba_number: null,
    vehicle_approvals: null,
    authority: null,
    conditions: null,
    part_category: null,
    notes: null,
    page_count: 1,
    manufacturer: null,
    invoice_number: "RW-2026-0118",
    mileage_km: 54_150,
    technical_specs: null,
    approval_fields: null,
    amount: 1_890,
    date: "2026-01-18",
    show_on_public_showcase: false,
    created_at: "2026-01-18T11:00:00.000Z",
  },
];

export const demoRwEditionDocuments: Document[] = [
  ...publicMods.map(buildModDocument),
  ...privateInvoiceDocuments,
];

const rwEditionTag: Tag = {
  id: "tag_demo_rw_edition",
  uuid: DEMO_RW_EDITION_TAG_UUID,
  vehicle_id: rwEditionVehicle.id,
  status: "active",
  created_at: now,
  updated_at: now,
};

export function isDemoRwEditionTag(tagUuid: string): boolean {
  return tagUuid.trim() === DEMO_RW_EDITION_TAG_UUID;
}

export function getDemoRwEditionTagScan(): TagScanResult {
  return {
    tag: rwEditionTag,
    vehicle: rwEditionVehicle,
    documents: demoRwEditionDocuments,
  };
}

export function buildDemoRwEditionPublicShowcasePayload(): PublicShowcasePayload {
  const base = buildPublicShowcasePayload(rwEditionVehicle, demoRwEditionDocuments);
  const vehicleLabel =
    `${rwEditionVehicle.make} ${rwEditionVehicle.model}`.trim();

  const photos = [
    {
      id: "rw-jcw-front",
      src: DEMO_RW_EDITION_SHOWCASE_IMAGE,
      alt: `${vehicleLabel} — RW Edition in Nardo Grey`,
    },
    {
      id: "rw-jcw-rear",
      src: DEMO_RW_EDITION_GALLERY_REAR_IMAGE,
      alt: `${vehicleLabel} — Heck mit RW Edition Kennzeichen`,
    },
    {
      id: "rw-jcw-workshop",
      src: DEMO_RW_EDITION_GALLERY_WORKSHOP_IMAGE,
      alt: `${vehicleLabel} — Umbau in der RW Edition Werkstatt`,
    },
    {
      id: "rw-jcw-exhaust",
      src: DEMO_RW_EDITION_GALLERY_EXHAUST_IMAGE,
      alt: `${vehicleLabel} — HJS Sport-Katalysator im Motorraum`,
    },
  ];

  return {
    ...base,
    photos,
    profile: {
      ...base.profile,
      heroImageSrc: DEMO_RW_EDITION_SHOWCASE_IMAGE,
      dynoChartUrl: DEMO_RW_EDITION_DYNO_CHART_URL,
      dynoChartIsImage: true,
      hideFinancials: true,
      isStoryPublic: false,
      publicSlug: null,
      notes: RW_EDITION_SPEC_NOTES,
      powerPs: DEMO_RW_EDITION_STAGE2.powerPs,
      torqueNm: DEMO_RW_EDITION_STAGE2.torqueNm,
      accel0To100Sec: DEMO_RW_EDITION_STAGE2.accel0To100Sec,
      accel100To200Sec: DEMO_RW_EDITION_STAGE2.accel100To200Sec,
      vmaxKmh: 235,
      engineSoundUrl: DEMO_ENGINE_SOUND_URL,
    },
    buildDna: DEMO_RW_EDITION_BUILD_DNA,
    buildStory: null,
    b2bPartner: {
      kicker: "Official Build by",
      name: "RW Edition",
      logoSrc: DEMO_RW_EDITION_LOGO_SRC,
      logoAlt: "RW Edition · MINI Tuning",
      ctaLabel: "Diesen Umbau anfragen",
      ctaHref: DEMO_RW_EDITION_PARTNER_WEB_URL,
    },
  };
}
