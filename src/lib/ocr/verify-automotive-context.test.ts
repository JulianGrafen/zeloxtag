import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetOcrLlmClient = vi.fn();
const mockBuildAbeVisionUserMessage = vi.fn();
const mockGetImageData = vi.fn();

vi.mock("@napi-rs/canvas", () => ({
  createCanvas: vi.fn(() => ({
    getContext: () => ({
      drawImage: vi.fn(),
      getImageData: mockGetImageData,
    }),
  })),
  loadImage: vi.fn().mockResolvedValue({ width: 64, height: 64 }),
}));

vi.mock("@/lib/ocr/llm-client", () => ({
  getOcrLlmClient: (...args: unknown[]) => mockGetOcrLlmClient(...args),
}));

vi.mock("@/lib/ocr/prepare-document-for-llm", () => ({
  buildAbeVisionUserMessage: (...args: unknown[]) =>
    mockBuildAbeVisionUserMessage(...args),
}));

function mockLlmResponse(payload: Record<string, unknown>) {
  mockGetOcrLlmClient.mockReturnValue({
    model: "gpt-test",
    client: {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: JSON.stringify(payload) } }],
          }),
        },
      },
    },
  });
}

function blackPngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(64).fill(0),
  ]);
}

describe("runAutomotiveGate", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetOcrLlmClient.mockReset();
    mockBuildAbeVisionUserMessage.mockReset();
    mockBuildAbeVisionUserMessage.mockResolvedValue([
      { type: "text", text: "classify" },
    ]);
    mockGetImageData.mockReturnValue({
      data: new Uint8ClampedArray(32 * 32 * 4).fill(0),
    });
    delete process.env.OCR_GATEKEEPER_DISABLED;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects near-uniform black raster images without calling the LLM", async () => {
    const { runAutomotiveGate } = await import("./verify-automotive-context");
    const result = await runAutomotiveGate(blackPngBuffer(), "image/png");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Kfz-Bezug");
    expect(mockGetOcrLlmClient).not.toHaveBeenCalled();
  });

  it("rejects non-automotive documents from the gatekeeper LLM", async () => {
    mockLlmResponse({
      isAutomotiveRelated: false,
      reason: "Lebensmittelkasse",
    });
    mockGetImageData.mockReturnValue({
      data: new Uint8ClampedArray(32 * 32 * 4).fill(200),
    });

    const { runAutomotiveGate } = await import("./verify-automotive-context");
    const jpegLike = Buffer.from([0xff, 0xd8, 0xff, ...Array(200).fill(128)]);
    const result = await runAutomotiveGate(jpegLike, "image/jpeg");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("Lebensmittelkasse");
    expect(mockGetOcrLlmClient).toHaveBeenCalled();
  });

  it("accepts automotive documents from the gatekeeper LLM", async () => {
    mockLlmResponse({
      isAutomotiveRelated: true,
      reason: null,
    });
    mockGetImageData.mockReturnValue({
      data: new Uint8ClampedArray(32 * 32 * 4).fill(200),
    });

    const { runAutomotiveGate } = await import("./verify-automotive-context");
    const jpegLike = Buffer.from([0xff, 0xd8, 0xff, ...Array(200).fill(128)]);
    const result = await runAutomotiveGate(jpegLike, "image/jpeg");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.isAutomotiveRelated).toBe(true);
  });

  it("bypasses the gatekeeper when OCR_GATEKEEPER_DISABLED is set", async () => {
    process.env.OCR_GATEKEEPER_DISABLED = "true";
    const { runAutomotiveGate } = await import("./verify-automotive-context");
    const result = await runAutomotiveGate(blackPngBuffer(), "image/png");

    expect(result.ok).toBe(true);
    expect(mockGetOcrLlmClient).not.toHaveBeenCalled();
  });
});

describe("normalizeAutomotiveContext", () => {
  it("rejects malformed gatekeeper JSON", async () => {
    const { normalizeAutomotiveContext } = await import(
      "./automotive-context-schema"
    );
    expect(() =>
      normalizeAutomotiveContext({ isAutomotiveRelated: "yes", reason: null }),
    ).toThrow();
  });
});
