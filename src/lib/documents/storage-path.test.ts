import { describe, expect, it } from "vitest";

import {
  documentStorageObjectPath,
  isDocumentStoragePath,
  resolveStoragePath,
} from "./storage-path";

const vehicleId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const documentId = "11111111-2222-4333-8444-555555555555";
const relative = `${vehicleId}/${documentId}-rechnung.pdf`;

describe("documentStorageObjectPath", () => {
  it("joins vehicle, document id, and sanitized filename", () => {
    expect(
      documentStorageObjectPath(vehicleId, documentId, "rechnung.pdf"),
    ).toBe(relative);
  });
});

describe("isDocumentStoragePath", () => {
  it("accepts the production object layout", () => {
    expect(isDocumentStoragePath(relative)).toBe(true);
  });

  it("rejects traversal and host URLs", () => {
    expect(isDocumentStoragePath(`${vehicleId}/../secret.pdf`)).toBe(false);
    expect(
      isDocumentStoragePath(
        `https://example.supabase.co/storage/v1/object/public/vehicle-documents/${relative}`,
      ),
    ).toBe(false);
  });
});

describe("resolveStoragePath", () => {
  it("returns a relative path as-is", () => {
    expect(resolveStoragePath(relative)).toBe(relative);
  });

  it("parses legacy public, authenticated, and signed URLs", () => {
    const host = "https://abc.supabase.co/storage/v1/object";
    expect(
      resolveStoragePath(`${host}/public/vehicle-documents/${relative}`),
    ).toBe(relative);
    expect(
      resolveStoragePath(
        `${host}/authenticated/vehicle-documents/${relative}`,
      ),
    ).toBe(relative);
    expect(
      resolveStoragePath(`${host}/sign/vehicle-documents/${relative}?token=x`),
    ).toBe(relative);
  });

  it("ignores mock, manual, demo, and traversal values", () => {
    expect(resolveStoragePath("mock://upload/x")).toBeNull();
    expect(resolveStoragePath("manual://entry")).toBeNull();
    expect(resolveStoragePath("/demo/invoice.pdf")).toBeNull();
    expect(resolveStoragePath(`${relative}/../escape`)).toBeNull();
  });
});
