/**
 * Read workshop / brand name from invoice logo via multimodal LLM.
 * Stylized logos often fail classic OCR — vision fills that gap.
 */

import { getInvoiceLlmClient, isLlmConfigured } from "./llm-client";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function toDataUrl(bytes: Buffer, contentType: string): string {
  const mime =
    contentType === "image/jpg" ? "image/jpeg" : contentType || "image/jpeg";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function parseVendorResponse(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed || /^null$/i.test(trimmed)) return null;

  try {
    const json = JSON.parse(trimmed) as { vendor?: unknown };
    if (typeof json.vendor === "string" && json.vendor.trim()) {
      return json.vendor.trim().slice(0, 160);
    }
    if (json.vendor === null) return null;
  } catch {
    // plain text fallback
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      const json = JSON.parse(fenced[1].trim()) as { vendor?: unknown };
      if (typeof json.vendor === "string" && json.vendor.trim()) {
        return json.vendor.trim().slice(0, 160);
      }
    } catch {
      // continue
    }
  }

  const line = trimmed.split("\n")[0]?.trim() ?? "";
  if (!line || /^null$/i.test(line) || line.length > 80) return null;
  return line.slice(0, 160);
}

/**
 * Extract the company/workshop name visible in the invoice header logo.
 */
export async function extractVendorFromLogoImage(input: {
  bytes: Buffer;
  contentType: string;
}): Promise<string | null> {
  if (!isLlmConfigured()) return null;

  const contentType = input.contentType.toLowerCase();
  if (!IMAGE_TYPES.has(contentType)) return null;

  // Keep payload reasonable for mobile photos.
  if (input.bytes.length > 4.5 * 1024 * 1024) return null;

  try {
    const { client, model: fallbackModel } = getInvoiceLlmClient();
    let model = fallbackModel;
    if (/^zeloxta/i.test(model)) {
      model = "gpt-5.4-nano";
    }

    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "Du liest Kfz-Rechnungen. Deine einzige Aufgabe: den Werkstatt-/Firmennamen aus dem LOGO oder der Kopfzeile oben lesen. Antworte nur als JSON: {\"vendor\":\"...\"} oder {\"vendor\":null}.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Welcher Anbieter-/Werkstattname steht im Logo oben auf dieser Rechnung? Ignoriere Kundennamen, Adressen und Beträge.",
            },
            {
              type: "image_url",
              image_url: {
                url: toDataUrl(input.bytes, contentType),
              },
            },
          ],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    return parseVendorResponse(content);
  } catch (error) {
    console.error(
      "Logo vision vendor extract failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return null;
  }
}
