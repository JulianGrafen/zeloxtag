import { MANUAL_ENTRY_MARKER } from "@/lib/documents/manual-entries";
import {
  BUILD_DNA_SCHEMA_VERSION,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { Document, Tag, TagScanResult, Vehicle } from "@/types/database";

import { DEMO_AULITZKY_SOUND_URL } from "./demo-aulitzky-showcase";

/** QR / tag uuid — keep in sync with `MOCK_TAG_UUIDS.undergroundGarage` in mock-tags. */
export const DEMO_UNDERGROUND_GARAGE_TAG_UUID = "demo-underground-garage";

export const MOCK_UNDERGROUND_GARAGE_VEHICLE_ID = "veh_demo_440i_g22";
export const DEMO_UNDERGROUND_GARAGE_INSTAGRAM_HANDLE = "underground.garage";
export const DEMO_UNDERGROUND_GARAGE_PARTNER_WEB_URL =
  "https://www.instagram.com/underground.garage/";
export const DEMO_UNDERGROUND_GARAGE_SHOWCASE_IMAGE =
  "/demo/underground-garage-440i.jpg";
export const DEMO_UNDERGROUND_GARAGE_LOGO_SRC =
  "/demo/underground-garage-logo.png";
export const DEMO_UNDERGROUND_GARAGE_DYNO_CHART_URL =
  "/demo/underground-garage-leistungsdiagramm-440i-stage1.png";

/** Dyno / performance figures (measured at Underground Garage). */
export const DEMO_UNDERGROUND_GARAGE_STAGE1 = {
  powerPs: 397.8,
  torqueNm: 529,
  accel0To100Sec: 4.48,
  accel100To200Sec: 10.83,
} as const;

export const DEMO_UNDERGROUND_GARAGE_STOCK = {
  powerPs: 346.4,
  torqueNm: 468,
  accel0To100Sec: 4.61,
  accel100To200Sec: 12.12,
} as const;

const UNDERGROUND_GARAGE_SPEC_NOTES =
  "Umbau durch Underground Garage: Stage-1-Software, Sport-Katalysator ab OPF und Carbon-Ansaugsystem am B58.";

export const DEMO_UNDERGROUND_GARAGE_BUILD_DNA: ShowcaseBuildDna = {
  version: BUILD_DNA_SCHEMA_VERSION,
  archetype: "OEM+",
  punchline:
    "Stage 1 am B58 — messbar mehr Druck, ohne Alltag aus dem Blick zu verlieren.",
  radar: [
    { category: "Leistung", score: 74 },
    { category: "Fahrwerk", score: 58 },
    { category: "Optik", score: 52 },
    { category: "Haltbarkeit", score: 72 },
    { category: "Akustik", score: 64 },
    { category: "Straßenlage", score: 66 },
  ],
};

const now = "2026-03-22T14:00:00.000Z";

const undergroundGarageVehicle: Vehicle = {
  id: MOCK_UNDERGROUND_GARAGE_VEHICLE_ID,
  user_id: "user_demo_underground_garage",
  make: "BMW",
  model: "440i",
  year: 2022,
  vin: "WBA53AK05NCH12345",
  tech_specs: {
    powerPs: DEMO_UNDERGROUND_GARAGE_STAGE1.powerPs,
    powerKw: 293,
    torqueNm: DEMO_UNDERGROUND_GARAGE_STAGE1.torqueNm,
    accel0To100Sec: DEMO_UNDERGROUND_GARAGE_STAGE1.accel0To100Sec,
    accel100To200Sec: DEMO_UNDERGROUND_GARAGE_STAGE1.accel100To200Sec,
    vmaxKmh: 250,
    engine: "3.0 L B58 Twin-Turbo · Stage 1",
    drivetrain: "xDrive",
    transmission: "8-Gang Steptronic",
    fuelType: "Benzin",
    buildPersonalityTags: ["oem_plus", "daily"],
    instagramHandle: DEMO_UNDERGROUND_GARAGE_INSTAGRAM_HANDLE,
    notes: UNDERGROUND_GARAGE_SPEC_NOTES,
  },
  silhouette_image_url: null,
  sound_url: DEMO_AULITZKY_SOUND_URL,
  is_public: true,
  hide_financials: true,
  public_slug: "underground-garage-440i",
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
    id: "doc_ug_stage1",
    title: "Stage 1 Software-Optimierung",
    vendor: "Underground Garage",
    date: "2026-02-14",
  },
  {
    id: "doc_ug_downpipe",
    title: "Sport-Katalysator (OPF-Back)",
    vendor: "Underground Garage",
    date: "2026-02-14",
  },
  {
    id: "doc_ug_intake",
    title: "Ansaugsystem · Carbon",
    vendor: "Underground Garage",
    date: "2026-01-28",
  },
];

function buildModDocument(
  mod: Pick<Document, "id" | "title" | "vendor" | "date">,
): Document {
  return {
    id: mod.id,
    vehicle_id: undergroundGarageVehicle.id,
    user_id: undergroundGarageVehicle.user_id,
    created_by: undergroundGarageVehicle.user_id,
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
    mileage_km: 42_800,
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
    id: "doc_ug_invoice_stage1",
    vehicle_id: undergroundGarageVehicle.id,
    user_id: undergroundGarageVehicle.user_id,
    created_by: undergroundGarageVehicle.user_id,
    title: "Rechnung Stage 1",
    type: "invoice",
    file_url: "/demo/invoice-oil.pdf",
    vendor: "Underground Garage",
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
    invoice_number: "UG-2026-0214",
    mileage_km: 42_750,
    technical_specs: null,
    approval_fields: null,
    amount: 1_290,
    date: "2026-02-14",
    show_on_public_showcase: false,
    created_at: "2026-02-14T11:00:00.000Z",
  },
];

export const demoUndergroundGarageDocuments: Document[] = [
  ...publicMods.map(buildModDocument),
  ...privateInvoiceDocuments,
];

const undergroundGarageTag: Tag = {
  id: "tag_demo_underground_garage",
  uuid: DEMO_UNDERGROUND_GARAGE_TAG_UUID,
  vehicle_id: undergroundGarageVehicle.id,
  status: "active",
  created_at: now,
  updated_at: now,
};

export function isDemoUndergroundGarageTag(tagUuid: string): boolean {
  return tagUuid.trim() === DEMO_UNDERGROUND_GARAGE_TAG_UUID;
}

export function getDemoUndergroundGarageTagScan(): TagScanResult {
  return {
    tag: undergroundGarageTag,
    vehicle: undergroundGarageVehicle,
    documents: demoUndergroundGarageDocuments,
  };
}

export function buildDemoUndergroundGaragePublicShowcasePayload(): PublicShowcasePayload {
  const base = buildPublicShowcasePayload(
    undergroundGarageVehicle,
    demoUndergroundGarageDocuments,
  );
  const vehicleLabel =
    `${undergroundGarageVehicle.make} ${undergroundGarageVehicle.model}`.trim();

  const photos = [
    {
      id: "ug-440i-hero",
      src: DEMO_UNDERGROUND_GARAGE_SHOWCASE_IMAGE,
      alt: `${vehicleLabel} — Underground Garage Stage 1`,
    },
  ];

  return {
    ...base,
    photos,
    profile: {
      ...base.profile,
      heroImageSrc: DEMO_UNDERGROUND_GARAGE_SHOWCASE_IMAGE,
      dynoChartUrl: DEMO_UNDERGROUND_GARAGE_DYNO_CHART_URL,
      dynoChartIsImage: true,
      hideFinancials: true,
      isStoryPublic: false,
      publicSlug: null,
      notes: UNDERGROUND_GARAGE_SPEC_NOTES,
      powerPs: DEMO_UNDERGROUND_GARAGE_STAGE1.powerPs,
      torqueNm: DEMO_UNDERGROUND_GARAGE_STAGE1.torqueNm,
      accel0To100Sec: DEMO_UNDERGROUND_GARAGE_STAGE1.accel0To100Sec,
      accel100To200Sec: DEMO_UNDERGROUND_GARAGE_STAGE1.accel100To200Sec,
      vmaxKmh: 250,
      engineSoundUrl: DEMO_AULITZKY_SOUND_URL,
    },
    buildDna: DEMO_UNDERGROUND_GARAGE_BUILD_DNA,
    buildStory: null,
    b2bPartner: {
      kicker: "Official Build by",
      name: "Underground Garage",
      logoSrc: DEMO_UNDERGROUND_GARAGE_LOGO_SRC,
      logoAlt: "Underground Garage",
      ctaLabel: "Diesen Umbau anfragen",
      ctaHref: DEMO_UNDERGROUND_GARAGE_PARTNER_WEB_URL,
    },
  };
}
