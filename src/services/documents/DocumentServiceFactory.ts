import { z } from "zod";

import {
  automotiveDocumentTypeSchema,
  type AutomotiveDocumentType,
} from "@/lib/validations/documentSchemas";

import type { DocumentParseService } from "./DocumentParseService";
import { UnsupportedDocumentTypeError } from "./DocumentValidationError";
import { EGBEService } from "./EGBEService";
import { EinzelabnahmeService } from "./EinzelabnahmeService";
import { TeilegutachtenService } from "./TeilegutachtenService";
import { TuevReportService } from "./TuevReportService";

export type DocumentServiceInstance =
  | TeilegutachtenService
  | EinzelabnahmeService
  | EGBEService
  | TuevReportService;

/**
 * Strategy factory — maps a document type discriminator to a parse service.
 */
export class DocumentServiceFactory {
  /**
   * @param documentType - `teilegutachten` | `einzelabnahme` | `egbe` | `tuev`
   * @throws {UnsupportedDocumentTypeError} when type is unknown / malformed
   */
  static create(documentType: AutomotiveDocumentType): DocumentServiceInstance;
  static create(documentType: string): DocumentServiceInstance;
  static create(documentType: string): DocumentServiceInstance {
    const parsed = automotiveDocumentTypeSchema.safeParse(documentType);
    if (!parsed.success) {
      throw new UnsupportedDocumentTypeError(String(documentType));
    }

    switch (parsed.data) {
      case "teilegutachten":
        return new TeilegutachtenService();
      case "einzelabnahme":
        return new EinzelabnahmeService();
      case "egbe":
        return new EGBEService();
      case "tuev":
        return new TuevReportService();
      default: {
        throw new UnsupportedDocumentTypeError(String(documentType));
      }
    }
  }

  /**
   * Convenience: pick service by type and validate payload in one call.
   * @throws {UnsupportedDocumentTypeError | DocumentValidationError}
   */
  static parseAndValidate(
    documentType: string,
    rawJson: unknown,
  ): ReturnType<DocumentParseService["parseAndValidate"]> {
    return this.create(documentType).parseAndValidate(rawJson);
  }
}

/** Functional alias for call sites that prefer a free function. */
export function createDocumentService(
  documentType: AutomotiveDocumentType | string,
): DocumentServiceInstance {
  return DocumentServiceFactory.create(documentType);
}

/** Zod helper for API route bodies that include `{ type, payload }`. */
export const documentParseRequestSchema = z
  .object({
    type: automotiveDocumentTypeSchema,
    payload: z.unknown(),
  })
  .strict();

export type DocumentParseRequest = z.infer<typeof documentParseRequestSchema>;
