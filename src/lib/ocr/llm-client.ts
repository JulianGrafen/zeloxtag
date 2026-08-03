import OpenAI from "openai";

export type LlmProvider = "azure-foundry" | "openai";

export type LlmClientConfig = {
  client: OpenAI;
  model: string;
  provider: LlmProvider;
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

/**
 * Shared chat client for invoice parsing.
 * Prefers Azure AI Foundry project endpoint when configured.
 */
export function getInvoiceLlmClient(): LlmClientConfig {
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

  const model =
    process.env.FOUNDRY_MODEL_NAME?.trim() ||
    process.env.AZURE_OPENAI_DEPLOYMENT?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-5.4-nano";

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

export function isLlmConfigured(): boolean {
  return Boolean(readApiKey());
}
