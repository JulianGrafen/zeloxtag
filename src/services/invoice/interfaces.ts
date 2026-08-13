/**
 * Provider-agnostic contracts for the hybrid invoice pipeline.
 * Swap Azure REST, @azure/ai-form-recognizer, or future OCR backends
 * without touching {@link HybridInvoiceService}.
 */

export type DocumentParseInput = {
  bytes: Buffer;
  contentType: string;
};

export type DocumentParseResult = {
  /** Layout OCR output (Markdown with spatial structure). */
  markdown: string;
  pageCount: number;
  tableCount: number;
};

export interface IDocumentParser {
  parse(input: DocumentParseInput): Promise<DocumentParseResult>;
}

export type JsonSchemaDefinition = {
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
};

export type ModelParseInput = {
  systemPrompt: string;
  userContent: string;
  jsonSchema?: JsonSchemaDefinition;
  /** Override routed deployment name */
  model?: string;
  maxTokens?: number;
};

export interface IModelEngine {
  parseStructuredJson<T>(input: ModelParseInput): Promise<T>;
}
