import OpenAI from "openai";

export type LlmProvider = "azure-foundry" | "openai";

export type LlmClientConfig = {
  client: OpenAI;
  model: string;
  provider: LlmProvider;
};

export type OcrLlmClientOptions = {
  /** Explicit chat deployment (from model routing). */
  model?: string;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function readApiKey(): string | null {
  return (
    process.env.API_KEY?.trim() ||
    process.env.AZURE_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null
  );
}

function defaultEconomyModel(): string {
  return (
    process.env.FOUNDRY_MODEL_ECONOMY?.trim() ||
    process.env.FOUNDRY_MODEL_NAME?.trim() ||
    process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-5.4-nano"
  );
}

/**
 * Shared chat client for OCR domain parse services (invoice + ABE).
 * Prefers Azure AI Foundry project endpoint when configured.
 * Pass `model` from {@link resolveParseModel} for cost/accuracy routing.
 */
export function getOcrLlmClient(options: OcrLlmClientOptions = {}): LlmClientConfig {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error(
      "Kein API-Key gesetzt. Erwartet: API_KEY, AZURE_API_KEY oder OPENAI_API_KEY.",
    );
  }

  const foundryEndpoint =
    process.env.FOUNDRY_PROJECT_ENDPOINT?.trim() ||
    process.env.AZURE_AI_PROJECT_ENDPOINT?.trim() ||
    "";

  const model = options.model?.trim() || defaultEconomyModel();

  if (foundryEndpoint) {
    const baseURL = `${trimTrailingSlash(foundryEndpoint)}/openai/v1`;
    return {
      provider: "azure-foundry",
      model,
      client: new OpenAI({
        apiKey,
        baseURL,
        defaultHeaders: {
          "api-key": apiKey,
        },
      }),
    };
  }

  return {
    provider: "openai",
    model,
    client: new OpenAI({ apiKey }),
  };
}

/** @deprecated Use {@link getOcrLlmClient}. */
export function getInvoiceLlmClient(options?: OcrLlmClientOptions): LlmClientConfig {
  return getOcrLlmClient(options);
}

export function isLlmConfigured(): boolean {
  return Boolean(readApiKey());
}
