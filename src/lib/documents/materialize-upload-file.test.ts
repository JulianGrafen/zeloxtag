import { describe, expect, it } from "vitest";

import { materializeUploadFile } from "./materialize-upload-file";

describe("materializeUploadFile", () => {
  it("copies bytes into a fresh File object", async () => {
    const source = new File(
      [new Uint8Array(Array.from({ length: 40 }, (_, index) => index))],
      "raw.bin",
      {
        type: "application/octet-stream",
      },
    );

    const materialized = await materializeUploadFile(source, {
      fallbackName: "upload.bin",
      fallbackMime: "application/octet-stream",
    });

    expect(materialized.name).toBe("raw.bin");
    expect(materialized.size).toBe(40);
    expect(new Uint8Array(await materialized.arrayBuffer()).byteLength).toBe(
      40,
    );
  });

  it("rejects empty uploads", async () => {
    const source = new File([new Uint8Array([1])], "tiny.bin");

    await expect(materializeUploadFile(source)).rejects.toThrow(
      "Datei ist leer",
    );
  });
});
