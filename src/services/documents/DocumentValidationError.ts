import type { ZodError, ZodIssue } from "zod";

import type { AutomotiveDocumentType } from "@/lib/validations/documentSchemas";

export type DocumentValidationIssue = {
  path: string;
  message: string;
  code: string;
};

/**
 * Structured validation failure for API routes.
 * Catch this instead of raw ZodError to return stable JSON to clients.
 */
export class DocumentValidationError extends Error {
  readonly code = "DOCUMENT_VALIDATION_FAILED" as const;
  readonly documentType: AutomotiveDocumentType;
  readonly issues: DocumentValidationIssue[];

  constructor(
    documentType: AutomotiveDocumentType,
    zodError: ZodError,
    message = "Document payload failed schema validation.",
  ) {
    super(message);
    this.name = "DocumentValidationError";
    this.documentType = documentType;
    this.issues = zodError.issues.map(mapZodIssue);
  }

  /** Safe JSON body for Next.js route handlers. */
  toJSON(): {
    ok: false;
    error: string;
    code: "DOCUMENT_VALIDATION_FAILED";
    documentType: AutomotiveDocumentType;
    issues: DocumentValidationIssue[];
  } {
    return {
      ok: false,
      error: this.message,
      code: this.code,
      documentType: this.documentType,
      issues: this.issues,
    };
  }
}

function mapZodIssue(issue: ZodIssue): DocumentValidationIssue {
  return {
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)",
    message: issue.message,
    code: issue.code,
  };
}

export function isDocumentValidationError(
  error: unknown,
): error is DocumentValidationError {
  return error instanceof DocumentValidationError;
}

/**
 * Thrown by the factory when `documentType` is not a known strategy key.
 */
export class UnsupportedDocumentTypeError extends Error {
  readonly code = "UNSUPPORTED_DOCUMENT_TYPE" as const;
  readonly received: string;

  constructor(received: string) {
    super(`Unsupported document type: ${received}`);
    this.name = "UnsupportedDocumentTypeError";
    this.received = received;
  }

  toJSON(): {
    ok: false;
    error: string;
    code: "UNSUPPORTED_DOCUMENT_TYPE";
    received: string;
  } {
    return {
      ok: false,
      error: this.message,
      code: this.code,
      received: this.received,
    };
  }
}

export function isUnsupportedDocumentTypeError(
  error: unknown,
): error is UnsupportedDocumentTypeError {
  return error instanceof UnsupportedDocumentTypeError;
}
