import { describe, expect, it } from "vitest";

import { manualServiceEntryFormSchema } from "@/lib/validations/manualServiceEntrySchema";

describe("manualServiceEntryFormSchema", () => {
  it("accepts a valid manual service entry payload", () => {
    const parsed = manualServiceEntryFormSchema.safeParse({
      vehicleId: "75c69a24-753f-4c1e-9798-7063ff40b73f",
      tagUuid: "demo-active-tag",
      serviceType: "oil_change",
      date: "2026-08-18",
      mileageKm: "84.200 km",
      amount: "129,90",
      details: "5W-30 Shell Helix",
      vendor: "ATU",
      notes: "Filter gewechselt",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.mileageKm).toBe(84200);
  });

  it("requires mileage", () => {
    const parsed = manualServiceEntryFormSchema.safeParse({
      vehicleId: "75c69a24-753f-4c1e-9798-7063ff40b73f",
      tagUuid: "demo-active-tag",
      serviceType: "service",
      date: "2026-08-18",
      mileageKm: "",
    });

    expect(parsed.success).toBe(false);
  });
});
