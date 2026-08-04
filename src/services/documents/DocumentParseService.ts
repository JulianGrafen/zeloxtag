import type {
  AutomotiveDocumentType,
  ParsedDocumentByType,
} from "@/lib/validations/documentSchemas";

/**
 * Strategy contract for automotive document parsers.
 * Each concrete service owns one Zod schema and one document type.
 */
export interface DocumentParseService<
  TType extends AutomotiveDocumentType = AutomotiveDocumentType,
> {
  readonly documentType: TType;

  /**
   * Validate OCR / LLM JSON against the service schema.
   * @throws {DocumentValidationError} when the payload is malformed
   */
  parseAndValidate(rawJson: unknown): ParsedDocumentByType[TType];
}

export type ParsedAutomotiveDocument = {
  [K in AutomotiveDocumentType]: {
    type: K;
    data: ParsedDocumentByType[K];
  };
}[AutomotiveDocumentType];
