import type { ZodType } from "zod";

import type {
  AutomotiveDocumentType,
  ParsedDocumentByType,
} from "@/lib/validations/documentSchemas";

import type { DocumentParseService } from "./DocumentParseService";
import { DocumentValidationError } from "./DocumentValidationError";

/**
 * Shared parse/validate pipeline — keeps concrete services DRY (Template Method).
 */
export abstract class BaseDocumentService<
  TType extends AutomotiveDocumentType,
> implements DocumentParseService<TType>
{
  abstract readonly documentType: TType;
  protected abstract readonly schema: ZodType<ParsedDocumentByType[TType]>;

  parseAndValidate(rawJson: unknown): ParsedDocumentByType[TType] {
    const result = this.schema.safeParse(rawJson);
    if (!result.success) {
      throw new DocumentValidationError(this.documentType, result.error);
    }
    return result.data;
  }
}
