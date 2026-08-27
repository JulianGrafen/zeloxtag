import { describe, expect, it } from "vitest";

import type { Document } from "@/types/database";

import { validateMileageAgainstHistory } from "./validate-mileage";

function doc(partial: Partial<Document> & Pick<Document, "id">): Document {
  return {
    vehicle_id: "v1",
    user_id: "u1",
    title: "TÜV",
    type: "tuev",
    file_url: "https://example.com/tuev.pdf",
    amount: null,
    date: "2026-01-15",
    created_at: "2026-01-15T10:00:00.000Z",
    mileage_km: 764_000,
    ...partial,
  } as Document;
}

describe("validateMileageAgainstHistory", () => {
  it("rejects km far below the last dated entry on the vehicle", () => {
    const result = validateMileageAgainstHistory(
      168_500,
      "2026-08-22",
      [doc({ id: "d1" })],
    );
    expect(result.ok).toBe(false);
    expect(result.warning).toMatch(/168\.500/);
  });
});
