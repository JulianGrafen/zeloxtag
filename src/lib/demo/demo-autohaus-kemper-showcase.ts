import { MANUAL_ENTRY_MARKER } from "@/lib/documents/manual-entries";
import {
  BUILD_DNA_SCHEMA_VERSION,
  type ShowcaseBuildDna,
} from "@/lib/showcase/build-dna-schema";
import { buildPublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { PublicShowcasePayload } from "@/lib/vehicles/public-showcase-data";
import type { Document, Tag, TagScanResult, Vehicle } from "@/types/database";

import { DEMO_ENGINE_SOUND_URL } from "./demo-assets";
import { mapDemoPublicModificationImages } from "./map-demo-public-modification-images";

/** QR / tag uuid — keep in sync with `MOCK_TAG_UUIDS.kemper` in mock-tags. */
export const DEMO_AUTOHAUS_KEMPER_TAG_UUID = "demo-autohaus-kemper";

export const MOCK_AUTOHAUS_KEMPER_VEHICLE_ID = "veh_demo_kemper_black_betty";
export const DEMO_AUTOHAUS_KEMPER_INSTAGRAM_HANDLE = "autohauskemper";
export const DEMO_AUTOHAUS_KEMPER_PARTNER_WEB_URL =
  "https://www.autohaus-kemper.de/";
export const DEMO_AUTOHAUS_KEMPER_SHOWCASE_IMAGE =
  "/demo/autohaus-kemper-black-betty-front.jpg";
export const DEMO_AUTOHAUS_KEMPER_GALLERY_SIDE_IMAGE =
  "/demo/autohaus-kemper-black-betty-side.jpg";
export const DEMO_AUTOHAUS_KEMPER_GALLERY_MEET_IMAGE =
  "/demo/autohaus-kemper-black-betty-meet.jpg";
export const DEMO_AUTOHAUS_KEMPER_GALLERY_WHEEL_IMAGE =
  "/demo/autohaus-kemper-black-betty-wheel.jpg";
export const DEMO_AUTOHAUS_KEMPER_LOGO_SRC =
  "/demo/autohaus-kemper-unique-projects-logo.png";

const KEMPER_SPEC_NOTES =
  "Unique Project „Black Betty“ von Autohaus Kemper: VW Golf V R32 mit Carbon-Breitbau, " +
  "exposed-carbon Front und Showcar-Setup — Käfig, BBS und Bremsanlage im Motorraum sichtbar.";

export const DEMO_AUTOHAUS_KEMPER_BUILD_DNA: ShowcaseBuildDna = {
  version: BUILD_DNA_SCHEMA_VERSION,
  archetype: "Showcar",
  punchline:
    "Carbon Breitbau trifft R32-VR6 — Black Betty lebt von Optik, Sound und Präsenz.",
  radar: [
    { category: "Leistung", score: 68 },
    { category: "Fahrwerk", score: 82 },
    { category: "Optik", score: 98 },
    { category: "Haltbarkeit", score: 58 },
    { category: "Akustik", score: 74 },
    { category: "Straßenlage", score: 71 },
  ],
};

const now = "2026-03-28T11:00:00.000Z";

const kemperVehicle: Vehicle = {
  id: MOCK_AUTOHAUS_KEMPER_VEHICLE_ID,
  user_id: "user_demo_autohaus_kemper",
  make: "VW",
  model: 'Golf V R32 „Black Betty"',
  year: 2008,
  vin: "WVWZZZ1KZ8W123456",
  tech_specs: {
    powerPs: 280,
    powerKw: 206,
    torqueNm: 360,
    accel0To100Sec: 5.8,
    accel100To200Sec: 14.2,
    vmaxKmh: 250,
    engine: "3.2 L VR6 · Kemper Showcar",
    drivetrain: "Allrad (4Motion)",
    transmission: "6-Gang DSG",
    fuelType: "Benzin",
    buildPersonalityTags: ["showcar", "kurvenraeuber"],
    instagramHandle: DEMO_AUTOHAUS_KEMPER_INSTAGRAM_HANDLE,
    notes: KEMPER_SPEC_NOTES,
  },
  silhouette_image_url: null,
  sound_url: DEMO_ENGINE_SOUND_URL,
  is_public: true,
  hide_financials: true,
  public_slug: "autohaus-kemper-black-betty",
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

type PublicModSeed = Pick<Document, "id" | "title" | "vendor" | "date"> & {
  imageUrl?: string;
};

const publicMods: PublicModSeed[] = [
  {
    id: "doc_kemper_carbon_widebody",
    title: "Carbon Breitbau · komplette Front",
    vendor: "Autohaus Kemper",
    date: "2025-11-08",
    imageUrl: DEMO_AUTOHAUS_KEMPER_SHOWCASE_IMAGE,
  },
  {
    id: "doc_kemper_carbon_hood",
    title: "Carbon Motorhaube · Lufteinlass",
    vendor: "Autohaus Kemper",
    date: "2025-11-08",
    imageUrl: DEMO_AUTOHAUS_KEMPER_GALLERY_MEET_IMAGE,
  },
  {
    id: "doc_kemper_bbs_brakes",
    title: "BBS LM · Bremsanlage",
    vendor: "Autohaus Kemper",
    date: "2025-12-02",
    imageUrl: DEMO_AUTOHAUS_KEMPER_GALLERY_WHEEL_IMAGE,
  },
  {
    id: "doc_kemper_airride",
    title: "Airride · Showcar-Setup",
    vendor: "Autohaus Kemper",
    date: "2026-01-10",
    imageUrl: DEMO_AUTOHAUS_KEMPER_GALLERY_SIDE_IMAGE,
  },
];

function buildModDocument(mod: PublicModSeed): Document {
  return {
    id: mod.id,
    vehicle_id: kemperVehicle.id,
    user_id: kemperVehicle.user_id,
    created_by: kemperVehicle.user_id,
    title: mod.title,
    type: "invoice",
    file_url: mod.imageUrl ?? `manual://umbau/${mod.id}`,
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
    mileage_km: 142_800,
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
    id: "doc_kemper_invoice_widebody",
    vehicle_id: kemperVehicle.id,
    user_id: kemperVehicle.user_id,
    created_by: kemperVehicle.user_id,
    title: "Rechnung Carbon Breitbau",
    type: "invoice",
    file_url: "/demo/invoice-carbon.pdf",
    vendor: "Autohaus Kemper",
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
    invoice_number: "AK-2025-1108",
    mileage_km: 142_600,
    technical_specs: null,
    approval_fields: null,
    amount: 18_900,
    date: "2025-11-08",
    show_on_public_showcase: false,
    created_at: "2025-11-08T11:00:00.000Z",
  },
];

export const demoAutohausKemperDocuments: Document[] = [
  ...publicMods.map(buildModDocument),
  ...privateInvoiceDocuments,
];

const kemperTag: Tag = {
  id: "tag_demo_autohaus_kemper",
  uuid: DEMO_AUTOHAUS_KEMPER_TAG_UUID,
  vehicle_id: kemperVehicle.id,
  status: "active",
  created_at: now,
  updated_at: now,
};

export function isDemoAutohausKemperTag(tagUuid: string): boolean {
  return tagUuid.trim() === DEMO_AUTOHAUS_KEMPER_TAG_UUID;
}

export function getDemoAutohausKemperTagScan(): TagScanResult {
  return {
    tag: kemperTag,
    vehicle: kemperVehicle,
    documents: demoAutohausKemperDocuments,
  };
}

export function buildDemoAutohausKemperPublicShowcasePayload(): PublicShowcasePayload {
  const base = buildPublicShowcasePayload(
    kemperVehicle,
    demoAutohausKemperDocuments,
  );
  const vehicleLabel =
    `${kemperVehicle.make} ${kemperVehicle.model}`.trim();

  const photos = [
    {
      id: "kemper-black-betty-front",
      src: DEMO_AUTOHAUS_KEMPER_SHOWCASE_IMAGE,
      alt: `${vehicleLabel} — Carbon Breitbau Front`,
    },
    {
      id: "kemper-black-betty-side",
      src: DEMO_AUTOHAUS_KEMPER_GALLERY_SIDE_IMAGE,
      alt: `${vehicleLabel} — Seitenansicht`,
    },
    {
      id: "kemper-black-betty-meet",
      src: DEMO_AUTOHAUS_KEMPER_GALLERY_MEET_IMAGE,
      alt: `${vehicleLabel} — Show & Shine`,
    },
    {
      id: "kemper-black-betty-wheel",
      src: DEMO_AUTOHAUS_KEMPER_GALLERY_WHEEL_IMAGE,
      alt: `${vehicleLabel} — BBS & Bremsanlage`,
    },
  ];

  return {
    ...base,
    photos,
    modifications: mapDemoPublicModificationImages(
      base.modifications,
      demoAutohausKemperDocuments,
    ),
    profile: {
      ...base.profile,
      heroImageSrc: DEMO_AUTOHAUS_KEMPER_SHOWCASE_IMAGE,
      dynoChartUrl: null,
      dynoChartIsImage: false,
      hideFinancials: true,
      isStoryPublic: false,
      publicSlug: null,
      notes: KEMPER_SPEC_NOTES,
      powerPs: 280,
      torqueNm: 360,
      accel0To100Sec: 5.8,
      accel100To200Sec: 14.2,
      vmaxKmh: 250,
      engineSoundUrl: DEMO_ENGINE_SOUND_URL,
    },
    buildDna: DEMO_AUTOHAUS_KEMPER_BUILD_DNA,
    buildStory: null,
    b2bPartner: {
      kicker: "Built by",
      name: "Autohaus Kemper",
      logoSrc: DEMO_AUTOHAUS_KEMPER_LOGO_SRC,
      logoAlt: "Unique Projects by Autohaus Kemper",
      logoPresentation: "wordmark",
      ctaLabel: "Projekt anfragen",
      ctaHref: DEMO_AUTOHAUS_KEMPER_PARTNER_WEB_URL,
    },
  };
}
