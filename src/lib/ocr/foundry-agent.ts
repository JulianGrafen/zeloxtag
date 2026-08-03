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

/** Fallback instructions aligned with the Foundry "Zeloxtag" agent. */
export const ZELOXTAG_AGENT_INSTRUCTIONS = `Du bist ein präziser Parser für Kfz-Dokumente (Rechnungen, ABE, Teilegutachten). Analysiere den OCR-Text und extrahiere strikt JSON.
Wenn ein Wert nicht auffindbar ist, setze ihn auf null.
Schema:
{
  "vendor": "string | null",
  "date": "YYYY-MM-DD | null",
  "amount": "number | null",
  "category": "tuning | service | tuev | repair | abe | other",
  "summary": "3-6 Wörter | null",
  "lineItems": [{ "label": "string", "amount": number }] | null,
  "kbaNumber": "string | null",
  "vehicleApprovals": ["string"] | null,
  "authority": "string | null",
  "conditions": ["string"] | null,
  "partCategory": "string | null",
  "notes": "string | null",
  "manufacturer": "string | null",
  "invoiceNumber": "string | null",
  "mileageKm": "number | null"
}
vendor-Regeln:
- Rechnung: Werkstatt-/Händlername.
- ABE: Bauteilname (z.B. "Carbon Frontlippe"), nicht nur die Marke.
invoiceNumber: nur Rechnungen (z.B. RE-2026-0312); sonst null.
mileageKm: nur Rechnungen — Kilometerstand als Ganzzahl (z.B. 67210 aus "67.210 km"); sonst null.
lineItems: nur Rechnungen inkl. MwSt.-Zeile wenn ausgewiesen; sonst null.
ABE-Regeln:
- manufacturer: Hersteller/Marke (AutoExe, Milltek, OZ, Tein)
- kbaNumber, authority (Behörde),
- vehicleApprovals: NUR Fahrzeughersteller + Fahrzeugmodell (z.B. "Mazda RX-8",
  "BMW 320i", "Audi A4 (B8)"). Nie technische Daten (ET, Lochkreis, Radlast,
  Felgengröße, EG-BE-Nr.). Nie nur Marke. Ein Eintrag pro Modell/Variante.
- conditions: jede Auflage VOLLSTÄNDIG und wörtlich aus dem Dokument
  (komplette Sätze, nicht kürzen, nicht zusammenfassen; ein Array-Eintrag pro Auflage),
- partCategory (Aerodynamik/Räder/Fahrwerk/…),
- notes (1-3 Sätze Freigabetext)
- bei Nicht-ABE: alle ABE-Felder null
Kategorie: abe | tuev | repair | service | tuning | other
Keine Erklärungen, nur JSON.`;
