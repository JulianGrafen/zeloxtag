import { MANUAL_ENTRY_MARKER } from "@/lib/documents/manual-entries";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import { vehicleCatalogImageUrl } from "@/lib/vehicles/vehicle-image";
import type { Document, Tag, TagScanResult, Vehicle } from "@/types/database";

import { MOCK_TAG_UUIDS } from "@/lib/tags/mock-tags";

export const MOCK_AULITZKY_VEHICLE_ID = "veh_demo_m3_g80";
export const DEMO_AULITZKY_PARTNER_APP_URL = "https://aulitzky-tuning.de";
export const DEMO_AULITZKY_VEHICLE_IMAGE = vehicleCatalogImageUrl(
  "m3-f82-cutout.png",
);
export const DEMO_AULITZKY_DYNO_CHART_URL = "/demo/dyno-aulitzky-placeholder.svg";
export const DEMO_AULITZKY_LOGO_SRC = "/demo/aulitzky-tuning-logo.png";

const now = "2026-03-20T12:00:00.000Z";

const aulitzkyVehicle: Vehicle = {
  id: MOCK_AULITZKY_VEHICLE_ID,
  user_id: "user_demo_aulitzky",
  make: "BMW",
  model: "M3 G80 Competition",
  year: 2023,
  vin: "WBS8M9C50P5A12345",
  tech_specs: {
    powerPs: 720,
    powerKw: 530,
    torqueNm: 850,
    accel0To100Sec: 3.2,
    engine: "3.0 L Twin-Turbo · Stage 2",
    drivetrain: "xDrive",
    transmission: "8-Gang M Steptronic",
    fuelType: "Benzin",
    dynoChartUrl: DEMO_AULITZKY_DYNO_CHART_URL,
    buildPersonalityTags: ["track", "stance"],
    notes:
      "Öffentliches Partner-Demo-Profil — Rechnungen und Preise sind für Besucher ausgeblendet.",
  },
  silhouette_image_url: null,
  sound_url: null,
  is_public: true,
  hide_financials: true,
  public_slug: "aulitzky-m3-g80",
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
  uuid: MOCK_TAG_UUIDS.aulitzky,
  vehicle_id: aulitzkyVehicle.id,
  status: "active",
  created_at: now,
  updated_at: now,
};

export function isDemoAulitzkyTag(tagUuid: string): boolean {
  return tagUuid.trim() === MOCK_TAG_UUIDS.aulitzky;
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
      id: "aulitzky-hero",
      src: DEMO_AULITZKY_VEHICLE_IMAGE,
      alt: vehicleLabel,
    },
    {
      id: "aulitzky-dyno",
      src: DEMO_AULITZKY_DYNO_CHART_URL,
      alt: "Leistungsdiagramm",
    },
  ];

  return {
    ...base,
    photos,
    profile: {
      ...base.profile,
      heroImageSrc: DEMO_AULITZKY_VEHICLE_IMAGE,
      dynoChartUrl: DEMO_AULITZKY_DYNO_CHART_URL,
      dynoChartIsImage: true,
      hideFinancials: true,
      isStoryPublic: false,
      publicSlug: null,
      powerPs: 720,
      torqueNm: 850,
      accel0To100Sec: 3.2,
    },
    buildDna: null,
    buildStory: null,
    b2bPartner: {
      kicker: "Official Build by",
      name: "Aulitzky Tuning",
      logoSrc: DEMO_AULITZKY_LOGO_SRC,
      logoAlt: "Aulitzky Tuning / Exhaust",
      ctaLabel: "Zur Aulitzky App",
      ctaHref: DEMO_AULITZKY_PARTNER_APP_URL,
    },
    featureFlags: {
      partnerPerformanceHero: true,
    },
  };
}
