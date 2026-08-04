/** Shared parse error for invoice and ABE LLM extraction. */
export class TextParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextParseError";
  }
}
