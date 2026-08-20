/** Shared parse error for invoice and ABE LLM extraction. */
export class TextParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextParseError";
  }
}

/** Bundler-safe check — `instanceof` breaks across duplicated server chunks. */
export function isTextParseError(error: unknown): error is TextParseError {
  if (error instanceof TextParseError) return true;
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as Error).name === "TextParseError"
  );
}
