import type { VehicleDashboardData } from "@/components/vehicle-dashboard";

export const DEMO_URL = "https://zeloxtag.de/demo";

export const demoVehicle: VehicleDashboardData = {
  ownerName: "Julian",
  vehicleModel: "RX-8",
  vehicleImage: "/vehicles/rx8.png",
  vehicleImageAlt: "Mazda RX-8",
  statusLabel: "ZeloxTag · Verbunden",
  lastOilChange: "2026-03-12",
  // Demo: last HU 2024-09-18 → next due +24 months
  nextInspection: {
    nextDate: "2026-09-18",
  },
  roadsidePhone: "+49 170 1234567",
};
