import { DEMO_DYNO_CHART_URL } from "@/lib/demo/demo-assets";
import type { VehicleTechSpecs } from "@/lib/vehicles/tech-specs";

/** Canonical technische Daten for the public BMW E36 demo twin. */
export const DEMO_E36_VEHICLE_TECH_SPECS: VehicleTechSpecs = {
  engine: "2.8 M52 · Stage 2 · Kompressor",
  powerPs: 301,
  powerKw: 221,
  torqueNm: 385,
  displacementCc: 2793,
  fuelType: "Benzin",
  transmission: "5-Gang manuell",
  drivetrain: "Heckantrieb",
  color: "Arctissilber Metallic",
  bodyType: "Coupé",
  notes:
    "E36 Widebody · KW V1 · BBS LM · GT-Flügel · Abstimmung auf dem Dyno-Stand (301 PS / 385 Nm am Rad).",
  instagramHandle: "julian.grafen",
  dynoChartUrl: DEMO_DYNO_CHART_URL,
  oilChangeIntervalKm: 10_000,
  oilChangeIntervalMonths: 12,
  accel0To100Sec: 5.4,
  accel100To200Sec: 11.8,
  vmaxKmh: 265,
  buildPersonalityTags: ["showcar", "tracktool", "oem_plus"],
};
