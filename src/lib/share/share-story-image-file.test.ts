import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canShareStoryImageFile,
  shareStoryImageFile,
} from "./share-story-image-file";

describe("shareStoryImageFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unavailable when share is missing", async () => {
    const file = new File([new Uint8Array([1])], "story.png", {
      type: "image/png",
    });
    expect(canShareStoryImageFile(file)).toBe(false);
    await expect(shareStoryImageFile(file)).resolves.toBe("unavailable");
  });

  it("shares with files only when supported", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "zelox-story.png", {
      type: "image/png",
    });
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: (data: { files?: File[] }) =>
        Array.isArray(data.files) && data.files.length > 0,
    });

    expect(canShareStoryImageFile(file)).toBe(true);
    await expect(shareStoryImageFile(file)).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [file] });
  });
});
