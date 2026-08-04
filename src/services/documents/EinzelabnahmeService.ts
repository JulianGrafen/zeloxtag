import {
  EinzelabnahmeSchema,
  type Einzelabnahme,
} from "@/lib/validations/documentSchemas";

import { BaseDocumentService } from "./BaseDocumentService";

/**
 * Parser for Einzelabnahme / Änderungsabnahme (§ 21 / § 19 Abs. 2 StVZO).
 */
export class EinzelabnahmeService extends BaseDocumentService<"einzelabnahme"> {
  readonly documentType = "einzelabnahme" as const;
  protected readonly schema = EinzelabnahmeSchema;

  override parseAndValidate(rawJson: unknown): Einzelabnahme {
    return super.parseAndValidate(rawJson);
  }
}
