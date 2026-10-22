import { MANUAL_ENTRY_MARKER } from "@/lib/documents/manual-entries";
import {
  BUILD_DNA_SCHEMA_VERSION,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { Document, Tag, TagScanResult, Vehicle } from "@/types/database";

/** QR / tag uuid — keep in sync with `MOCK_TAG_UUIDS.aulitzky` in mock-tags. */
export const DEMO_AULITZKY_TAG_UUID = "demo-aulitzky";

export const MOCK_AULITZKY_VEHICLE_ID = "veh_demo_m3_g80";
export const DEMO_AULITZKY_PARTNER_WEB_URL =
  "https://aulitzkyexhaust.de/Tuning/Abgassysteme/Abgasanlagen/";
export const DEMO_AULITZKY_VEHICLE_IMAGE = "/demo/aulitzky-hero.jpg";
/** Front-facing build photo — primary showcase hero & carousel lead. */
export const DEMO_AULITZKY_SHOWCASE_IMAGE = "/demo/aulitzky-showcase.jpg";
export const DEMO_AULITZKY_GALLERY_EXHAUST_IMAGE = "/demo/aulitzky-exhaust.jpg";
export const DEMO_AULITZKY_LOGO_SRC = "/demo/aulitzky-tuning-logo.png";
/** M3 soundcheck clip (11–18 s from partner source), same pattern as E36 `/demo/…`. */
export const DEMO_AULITZKY_SOUND_URL = "/demo/aulitzky-soundcheck.mp3";
export const DEMO_AULITZKY_DYNO_CHART_URL =
  "/demo/aulitzky-leistungsdiagramm-m4-720ps.pdf";

/** Curated DNA for the partner M4 — not the E36-style „Heimlicher Renner“ heuristic. */
export const DEMO_AULITZKY_BUILD_DNA: ShowcaseBuildDna = {
  version: BUILD_DNA_SCHEMA_VERSION,
  archetype: "Streckenwaffe",
  punchline:
    "720 PS Stage 2 von Aulitzky — laut, präzise, für Straße und gelegentliche Runde.",
  radar: [
    { category: "Leistung", score: 91 },
    { category: "Fahrwerk", score: 72 },
    { category: "Optik", score: 62 },
    { category: "Haltbarkeit", score: 54 },
    { category: "Akustik", score: 78 },
    { category: "Straßenlage", score: 68 },
  ],
};

const now = "2026-03-20T12:00:00.000Z";

const aulitzkyVehicle: Vehicle = {
  id: MOCK_AULITZKY_VEHICLE_ID,
  user_id: "user_demo_aulitzky",
  make: "BMW",
  model: "M4 G82 Competition",
  year: 2023,
  vin: "WBS8M9C50P5A12345",
  tech_specs: {
    powerPs: 720,
    powerKw: 530,
    torqueNm: 850,
    accel0To100Sec: 3.2,
    accel100To200Sec: 8.1,
    vmaxKmh: 305,
    engine: "3.0 L Twin-Turbo · Stage 2",
    drivetrain: "xDrive",
    transmission: "8-Gang M Steptronic",
    fuelType: "Benzin",
    buildPersonalityTags: ["track", "stance"],
    notes:
      "• Aulitzky Stage 2 + OPF-Abgasanlage\n" +
      "• 720 PS · 850 Nm · 3,2 s (Dyno)\n" +
      "• Eventuri Ansaugung · KW V4 · G82 xDrive",
  },
  silhouette_image_url: null,
  sound_url: DEMO_AULITZKY_SOUND_URL,
  is_public: true,
  hide_financials: true,
  public_slug: "aulitzky-m4-g82",
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
    id: "doc_aulitzky_exhaust",
    title: "Aulitzky Abgasanlage ab OPF",
    vendor: "Aulitzky Tuning",
    date: "2025-09-12",
  },
  {
    id: "doc_aulitzky_intake",
    title: "Eventuri Carbon Ansaugung",
    vendor: "Eventuri",
    date: "2025-09-12",
  },
  {
    id: "doc_aulitzky_stage2",
    title: "Aulitzky Stage 2 Software-Optimierung",
    vendor: "Aulitzky Tuning",
    date: "2025-10-03",
  },
  {
    id: "doc_aulitzky_kw",
    title: "KW V4 Gewindefahrwerk",
    vendor: "KW Suspension",
    date: "2025-08-20",
  },
];

function buildModDocument(
  mod: Pick<Document, "id" | "title" | "vendor" | "date">,
): Document {
  return {
    id: mod.id,
    vehicle_id: aulitzkyVehicle.id,
    user_id: aulitzkyVehicle.user_id,
    created_by: aulitzkyVehicle.user_id,
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
    mileage_km: 18_400,
    technical_specs: null,
    approval_fields: null,
    amount: null,
    date: mod.date,
    show_on_public_showcase: true,
    created_at: mod.date ? `${mod.date}T10:00:00.000Z` : now,
  };
}

/** Private invoices — never opted into public showcase (privacy simulation). */
const privateInvoiceDocuments: Document[] = [
  {
    id: "doc_aulitzky_invoice_exhaust",
    vehicle_id: aulitzkyVehicle.id,
    user_id: aulitzkyVehicle.user_id,
    created_by: aulitzkyVehicle.user_id,
    title: "Rechnung Abgasanlage",
    type: "invoice",
    file_url: "/demo/invoice-exhaust.pdf",
    vendor: "Aulitzky Tuning",
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
    invoice_number: "AT-2025-1842",
    mileage_km: 18_200,
    technical_specs: null,
    approval_fields: null,
    amount: 4_890,
    date: "2025-09-12",
    show_on_public_showcase: false,
    created_at: "2025-09-12T11:00:00.000Z",
  },
  {
    id: "doc_aulitzky_invoice_stage2",
    vehicle_id: aulitzkyVehicle.id,
    user_id: aulitzkyVehicle.user_id,
    created_by: aulitzkyVehicle.user_id,
    title: "Rechnung Stage 2",
    type: "invoice",
    file_url: "/demo/invoice-oil.pdf",
    vendor: "Aulitzky Tuning",
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
    invoice_number: "AT-2025-2103",
    mileage_km: 18_400,
    technical_specs: null,
    approval_fields: null,
    amount: 1_650,
    date: "2025-10-03",
    show_on_public_showcase: false,
    created_at: "2025-10-03T11:00:00.000Z",
  },
];

export const demoAulitzkyDocuments: Document[] = [
  ...publicMods.map(buildModDocument),
  ...privateInvoiceDocuments,
];

const aulitzkyTag: Tag = {
  id: "tag_demo_aulitzky",
  uuid: DEMO_AULITZKY_TAG_UUID,
  vehicle_id: aulitzkyVehicle.id,
  status: "active",
  created_at: now,
  updated_at: now,
};

export function isDemoAulitzkyTag(tagUuid: string): boolean {
  return tagUuid.trim() === DEMO_AULITZKY_TAG_UUID;
}

export function getDemoAulitzkyTagScan(): TagScanResult {
  return {
    tag: aulitzkyTag,
    vehicle: aulitzkyVehicle,
    documents: demoAulitzkyDocuments,
  };
}

export function buildDemoAulitzkyPublicShowcasePayload(): PublicShowcasePayload {
  const base = buildPublicShowcasePayload(aulitzkyVehicle, demoAulitzkyDocuments);
  const vehicleLabel = `${aulitzkyVehicle.make} ${aulitzkyVehicle.model}`.trim();

  const photos = [
    {
      id: "aulitzky-showcase",
      src: DEMO_AULITZKY_SHOWCASE_IMAGE,
      alt: `${vehicleLabel} — Aulitzky Build`,
    },
    {
      id: "aulitzky-hero",
      src: DEMO_AULITZKY_VEHICLE_IMAGE,
      alt: vehicleLabel,
    },
    {
      id: "aulitzky-exhaust",
      src: DEMO_AULITZKY_GALLERY_EXHAUST_IMAGE,
      alt: `${vehicleLabel} — Aulitzky Abgasanlage`,
    },
  ];

  return {
    ...base,
    photos,
    profile: {
      ...base.profile,
      heroImageSrc: DEMO_AULITZKY_SHOWCASE_IMAGE,
      dynoChartUrl: DEMO_AULITZKY_DYNO_CHART_URL,
      dynoChartIsImage: false,
      hideFinancials: true,
      isStoryPublic: false,
      publicSlug: null,
      powerPs: 720,
      torqueNm: 850,
      accel0To100Sec: 3.2,
      accel100To200Sec: 8.1,
      vmaxKmh: 305,
      engineSoundUrl: DEMO_AULITZKY_SOUND_URL,
    },
    buildDna: DEMO_AULITZKY_BUILD_DNA,
    buildStory: null,
    b2bPartner: {
      kicker: "Official Build by",
      name: "Aulitzky Tuning",
      logoSrc: DEMO_AULITZKY_LOGO_SRC,
      logoAlt: "Aulitzky Tuning / Exhaust",
      ctaLabel: "Diesen Umbau anfragen",
      ctaHref: DEMO_AULITZKY_PARTNER_WEB_URL,
    },
  };
}
