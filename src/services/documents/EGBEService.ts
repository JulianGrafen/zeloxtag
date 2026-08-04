import { EGBESchema, type EGBE } from "@/lib/validations/documentSchemas";

import { BaseDocumentService } from "./BaseDocumentService";

/**
 * Parser for EG / ECE type approvals (E-Prüfzeichen).
 */
export class EGBEService extends BaseDocumentService<"egbe"> {
  readonly documentType = "egbe" as const;
  protected readonly schema = EGBESchema;

  override parseAndValidate(rawJson: unknown): EGBE {
    return super.parseAndValidate(rawJson);
  }
}
