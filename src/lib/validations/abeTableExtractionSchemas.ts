import { z } from "zod";

import { parseAllTireSizes } from "@/lib/ocr/abe-wizard-vehicle-normalize";
import { normalizeAuflagenKuerzel } from "@/lib/ocr/auflagen-kuerzel-db";
import type {
  AbeConfiguration,
  AbeTableExtraction,
  AbeVehicle,
} from "@/types/abe";

export const AbeConfigurationSchema = z
  .object({
    kw_range: z.string(),
    tire_size: z.string(),
    auflagen_codes: z.array(z.string()),
  })
  .strict();

export const AbeVehicleSchema = z
  .object({
    model_name: z.string(),
    configurations: z.array(AbeConfigurationSchema),
  })
  .strict();

export const AbeTableExtractionSchema = z
  .object({
    vehicles: z.array(AbeVehicleSchema),
  })
  .strict();

const EWG_APPROVAL_PATTERN =
  /\be\d[\d*./\\-]*\d{2,}[\d*./\\-]*\b|\be1\*[\d/*\s.-]+/gi;

const FAHRZEUGTYP_IN_MODEL_PATTERN =
  /\b(?:\d{1,2}[a-zA-Z]?-\w+|\d{1,2}[a-zA-Z]?|\d{1,2}\/[A-Z]{1,3}|\d{3}[A-Z]?)\b/g;

export const ABE_TABLE_EXTRACTION_JSON_SCHEMA = {
  name: "abe_table_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["vehicles"],
    properties: {
      vehicles: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["model_name", "configurations"],
          properties: {
            model_name: {
              type: "string",
              description:
                "Commercial vehicle name from the printed Handelsbezeichnung only. Copy verbatim. No type codes or EG-BE. Never invent a model.",
            },
            configurations: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["kw_range", "tire_size", "auflagen_codes"],
                properties: {
                  kw_range: {
                    type: "string",
                    description: "kW-Bereich value, e.g. 85-141",
                  },
                  tire_size: {
                    type: "string",
                    description:
                      "ALL tire sizes from the Reifen column for this row, comma-separated when multiple are printed (e.g. '215/45R17, 225/45R17'). Empty string when column missing.",
                  },
                  auflagen_codes: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Merged Auflagen codes from Reifenbezogene Auflagen and Auflagen und Hinweise columns.",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const ABE_TABLE_EXTRACTION_SYSTEM_PROMPT = `You are an expert data extraction system for German automotive TÜV/ABE certificates.
Analyze the provided table image and extract the data strictly into the provided JSON schema.

RULES FOR EXTRACTION:

'model_name': Look at the first column ('Handelsbezeichnung'). Extract ONLY the commercial vehicle name printed there. Completely ignore and remove internal type codes and approval numbers. Never invent a model that is not on the image.

Grouping (Row Spans): A vehicle name in the first column applies to ALL subsequent rows to its right and below it, until a NEW vehicle name appears in the first column. Group all 'kW-Bereich', 'Reifen', and 'Auflagen' under that single vehicle.

'auflagen_codes': Combine the codes from BOTH the 'Reifenbezogene Auflagen' column and the 'Auflagen und Hinweise' column into a single flat array of strings. Remove spaces (e.g., 'K 2b' -> 'K2b').

'tire_size': Copy EVERY tyre size printed in the Reifen column for that row. When multiple sizes appear in one cell (e.g. '215/45R17 225/45R17'), return them comma-separated — never drop a size.

Do not hallucinate. If a cell is completely unreadable, skip that specific row.`;

function cleanAuflagenToken(raw: string): string {
  return normalizeAuflagenKuerzel(raw.replace(/\s+/g, ""));
}

function cleanModelName(raw: string): string {
  let name = raw.trim();
  if (!name) return "";

  name = name.replace(EWG_APPROVAL_PATTERN, " ");
  name = name.replace(FAHRZEUGTYP_IN_MODEL_PATTERN, " ");
  name = name.replace(/\s*[*/\\]+\s*/g, " ");
  name = name.replace(/\(\s*\)/g, " ");
  name = name.replace(/\s*,\s*,+/g, ", ");
  name = name.replace(/\s+/g, " ").trim();
  name = name.replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, "").trim();

  return name;
}

function normalizeConfiguration(raw: AbeConfiguration): AbeConfiguration | null {
  const kw_range = raw.kw_range.trim();
  const tireSizes = parseAllTireSizes(raw.tire_size);
  const tire_size = tireSizes.join(", ");
  const auflagen_codes = Array.from(
    new Set(
      raw.auflagen_codes
        .map((code) => cleanAuflagenToken(code))
        .filter(Boolean),
    ),
  );

  if (!kw_range && !tire_size && auflagen_codes.length === 0) {
    return null;
  }

  return {
    kw_range,
    tire_size,
    auflagen_codes,
  };
}

function normalizeVehicle(raw: AbeVehicle): AbeVehicle | null {
  const model_name = cleanModelName(raw.model_name);
  const configurations = raw.configurations
    .map((config) => normalizeConfiguration(config))
    .filter((config): config is AbeConfiguration => config !== null);

  if (!model_name || configurations.length === 0) return null;

  return { model_name, configurations };
}

export function emptyAbeTableExtraction(): AbeTableExtraction {
  return { vehicles: [] };
}

export function normalizeAbeTableExtraction(
  raw: AbeTableExtraction,
): AbeTableExtraction {
  const vehicles = raw.vehicles
    .map((vehicle) => normalizeVehicle(vehicle))
    .filter((vehicle): vehicle is AbeVehicle => vehicle !== null);

  return { vehicles };
}

export function isAbeTableExtractionEmpty(extraction: AbeTableExtraction): boolean {
  return normalizeAbeTableExtraction(extraction).vehicles.length === 0;
}
