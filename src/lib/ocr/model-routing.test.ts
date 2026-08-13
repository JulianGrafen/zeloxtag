import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_INVOICE_PARSE_MODEL,
  DEFAULT_PARSE_MODEL,
  isInvoiceNanoTestMode,
  resolveInvoiceParseModel,
  resolveParseModel,
} from "@/lib/ocr/model-routing";

describe("resolveParseModel", () => {
  afterEach(() => {
    delete process.env.FOUNDRY_MODEL_INVOICE;
    delete process.env.FOUNDRY_MODEL_NAME;
    delete process.env.FOUNDRY_MODEL_ECONOMY;
    delete process.env.INVOICE_USE_NANO;
  });

  it("routes invoices to GPT-5.4 by default", () => {
    expect(resolveParseModel("invoice")).toBe(DEFAULT_INVOICE_PARSE_MODEL);
    expect(resolveInvoiceParseModel()).toBe(DEFAULT_INVOICE_PARSE_MODEL);
    expect(DEFAULT_INVOICE_PARSE_MODEL).toBe("gpt-5.4");
  });

  it("respects FOUNDRY_MODEL_INVOICE when set to a full model", () => {
    process.env.FOUNDRY_MODEL_INVOICE = "custom-invoice-model";
    expect(resolveParseModel("invoice")).toBe("custom-invoice-model");
  });

  it("ignores legacy FOUNDRY_MODEL_INVOICE nano override", () => {
    process.env.FOUNDRY_MODEL_INVOICE = "gpt-5.4-nano";
    expect(resolveParseModel("invoice")).toBe("gpt-5.4");
  });

  it("routes invoices to nano when INVOICE_USE_NANO=true", () => {
    process.env.INVOICE_USE_NANO = "true";
    expect(isInvoiceNanoTestMode()).toBe(true);
    expect(resolveParseModel("invoice")).toBe(DEFAULT_PARSE_MODEL);
    expect(resolveInvoiceParseModel()).toBe("gpt-5.4-nano");
  });

  it("prefers explicit FOUNDRY_MODEL_INVOICE over INVOICE_USE_NANO", () => {
    process.env.INVOICE_USE_NANO = "true";
    process.env.FOUNDRY_MODEL_INVOICE = "gpt-5.4";
    expect(resolveParseModel("invoice")).toBe("gpt-5.4");
  });

  it("does not let global economy model override invoice default", () => {
    process.env.FOUNDRY_MODEL_NAME = "gpt-5.4-nano";
    expect(resolveParseModel("invoice")).toBe("gpt-5.4");
  });

  it("keeps ABE/TÜV on nano unless FOUNDRY_MODEL_NAME is set", () => {
    expect(resolveParseModel("abe")).toBe(DEFAULT_PARSE_MODEL);
    expect(resolveParseModel("tuev")).toBe(DEFAULT_PARSE_MODEL);

    process.env.FOUNDRY_MODEL_NAME = "gpt-5.4-nano";
    expect(resolveParseModel("abe")).toBe("gpt-5.4-nano");
  });
});
