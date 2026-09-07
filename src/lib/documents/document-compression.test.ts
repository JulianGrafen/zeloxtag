import { afterEach, describe, expect, it, vi } from "vitest";

const { imageCompression, resizeDocumentImage } = vi.hoisted(() => ({
  imageCompression: vi.fn(),
  resizeDocumentImage: vi.fn(),
}));

vi.mock("browser-image-compression", () => ({
  default: imageCompression,
}));

vi.mock("@/lib/utils/image-optimizer", () => ({
  resizeDocumentImage,
}));

import {
  compressDocumentFile,
  DocumentCompressionError,
} from "./document-compression";

function jpegBytes(size = 256): Uint8Array {
  const out = new Uint8Array(size);
  out[0] = 0xff;
  out[1] = 0xd8;
  out[2] = 0xff;
  out[3] = 0xd9;
  return out;
}

function makeImageFile(bytes = jpegBytes()): File {
  return new File([bytes], "umbau.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

describe("compressDocumentFile", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("uses browser-image-compression on the main thread", async () => {
    const input = makeImageFile();
    const output = new File([jpegBytes(128)], "umbau.jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    imageCompression.mockResolvedValueOnce(output);

    const result = await compressDocumentFile(input);

    expect(result.kind).toBe("image");
    expect(result.file.type).toBe("image/jpeg");
    expect(imageCompression).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ useWebWorker: false }),
    );
    expect(resizeDocumentImage).not.toHaveBeenCalled();
  });

  it("falls back to canvas resize when library compression fails", async () => {
    const input = makeImageFile();
    imageCompression.mockRejectedValueOnce(new Error("worker failed"));

    resizeDocumentImage.mockResolvedValueOnce({
      canvas: {
        toBlob: (callback: (blob: Blob | null) => void) => {
          callback(
            new Blob([new Uint8Array(128)], { type: "image/jpeg" }),
          );
        },
      } as HTMLCanvasElement,
      dataUrl: "data:image/jpeg;base64,abc",
      byteLength: 128,
      width: 10,
      height: 10,
    });

    const result = await compressDocumentFile(input);

    expect(result.kind).toBe("image");
    expect(resizeDocumentImage).toHaveBeenCalledOnce();
  });

  it("rejects empty image files", async () => {
    const input = new File([new Uint8Array(4)], "empty.jpg", {
      type: "image/jpeg",
    });

    await expect(compressDocumentFile(input)).rejects.toBeInstanceOf(
      DocumentCompressionError,
    );
  });
});
