/**
 * Azure Document Intelligence env helpers (TÜV hybrid OCR).
 */

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getDocumentIntelligenceEnv(): {
  endpoint: string;
  apiKey: string;
  isConfigured: boolean;
} {
  const endpointRaw =
    process.env.DOCUMENTINTELLIGENCE_ENDPOINT?.trim() ||
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT?.trim() ||
    process.env.AZURE_FORM_RECOGNIZER_ENDPOINT?.trim() ||
    "";

  const apiKey =
    process.env.DOCUMENTINTELLIGENCE_API_KEY?.trim() ||
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY?.trim() ||
    process.env.AZURE_FORM_RECOGNIZER_KEY?.trim() ||
    process.env.API_KEY?.trim() ||
    "";

  const endpoint = endpointRaw ? `${trimTrailingSlash(endpointRaw)}/` : "";

  return {
    endpoint,
    apiKey,
    isConfigured: Boolean(endpoint && apiKey),
  };
}
