/**
 * Load prompt-agent definition from Azure AI Foundry (API key auth).
 * Note: running Agents via /threads/runs requires Entra ID; with API keys we
 * reuse the agent's instructions + model via chat.completions.
 */

const DEFAULT_AGENT_NAME = "Zeloxtag";

export type FoundryAgentDefinition = {
  id: string;
  name: string;
  model: string;
  instructions: string;
  versionId: string;
};

type FoundryAgentsListResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    versions?: {
      latest?: {
        id?: string;
        definition?: {
          model?: string;
          instructions?: string;
        };
      };
    };
  }>;
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

function projectEndpoint(): string | null {
  const endpoint =
    process.env.FOUNDRY_PROJECT_ENDPOINT?.trim() ||
    process.env.AZURE_AI_PROJECT_ENDPOINT?.trim() ||
    "";
  return endpoint ? trimTrailingSlash(endpoint) : null;
}

export function getConfiguredFoundryAgentName(): string {
  return (
    process.env.FOUNDRY_AGENT_NAME?.trim() ||
    process.env.FOUNDRY_AGENT_ID?.trim() ||
    DEFAULT_AGENT_NAME
  );
}

/**
 * Resolve the Foundry prompt agent by name/id and return model + instructions.
 */
export async function loadFoundryAgentDefinition(
  agentName = getConfiguredFoundryAgentName(),
): Promise<FoundryAgentDefinition | null> {
  const endpoint = projectEndpoint();
  const apiKey = readApiKey();
  if (!endpoint || !apiKey) return null;

  const response = await fetch(`${endpoint}/agents?api-version=v1`, {
    headers: {
      "api-key": apiKey,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Foundry agents list failed (${response.status}): ${(await response.text()).slice(0, 240)}`,
    );
  }

  const payload = (await response.json()) as FoundryAgentsListResponse;
  const agents = payload.data ?? [];
  const needle = agentName.toLowerCase();

  const match =
    agents.find((agent) => agent.id?.toLowerCase() === needle) ||
    agents.find((agent) => agent.name?.toLowerCase() === needle) ||
    agents.find((agent) => agent.name?.toLowerCase().startsWith(needle)) ||
    null;

  if (!match?.id) return null;

  const latest = match.versions?.latest;
  const model = latest?.definition?.model?.trim();
  const instructions = latest?.definition?.instructions?.trim();

  if (!model || !instructions) {
    throw new Error(
      `Foundry agent "${match.name ?? match.id}" has no model/instructions.`,
    );
  }

  return {
    id: match.id,
    name: match.name ?? match.id,
    model,
    instructions: stripWrappingBackticks(instructions),
    versionId: latest?.id ?? `${match.id}:latest`,
  };
}

function stripWrappingBackticks(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length > 2) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * @deprecated Invoice prompts live in `invoice-parse-prompts.ts`.
 * Kept as alias for any external Foundry-agent references.
 */
export { INVOICE_SYSTEM_PROMPT as ZELOXTAG_AGENT_INSTRUCTIONS } from "./invoice-parse-prompts";
