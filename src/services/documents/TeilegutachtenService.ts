import {
  TeilegutachtenSchema,
  type Teilegutachten,
} from "@/lib/validations/documentSchemas";

import { BaseDocumentService } from "./BaseDocumentService";

/**
 * Parser for Teilegutachten (§ 19 Abs. 3 StVZO).
 */
export class TeilegutachtenService extends BaseDocumentService<"teilegutachten"> {
  readonly documentType = "teilegutachten" as const;
  protected readonly schema = TeilegutachtenSchema;

  /** Narrow return type for callers that hold this concrete class. */
  override parseAndValidate(rawJson: unknown): Teilegutachten {
    return super.parseAndValidate(rawJson);
  }
}
