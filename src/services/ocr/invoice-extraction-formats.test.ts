import { describe, expect, it } from "vitest";

import {
  SPEEDWORKZ_EXPECTED_LINE_ITEMS,
  SPEEDWORKZ_LLM_RAW_LINE_ITEMS,
  SPEEDWORKZ_NET_SUM,
  SPEEDWORKZ_OCR_TEXT,
} from "@/lib/ocr/fixtures/speedworkz-invoice-line-items";
import { reconcileInvoicePlausibility } from "@/lib/ocr/invoice-plausibility";
import {
  isGarbageWorkshopLineItems,
  resolveWorkshopLineItems,
} from "@/lib/ocr/invoice-workshop-sections";
import { processLineItems } from "@/utils/invoiceMath";

describe("workshop-section invoice extraction pipeline (Speedworkz)", () => {
  it("preserves discounted Ersatzteile rows with standard checksum mode", () => {
    const processed = processLineItems(SPEEDWORKZ_LLM_RAW_LINE_ITEMS, {
      checksumMode: "standard",
    });

    expect(processed).toHaveLength(8);
    expect(processed[6]!.gesamtpreis).toBeCloseTo(28.73, 2);
    expect(processed.reduce((sum, row) => sum + row.gesamtpreis, 0)).toBeCloseTo(
      SPEEDWORKZ_NET_SUM,
      2,
    );
  });

  it("falls back to OCR section parser when LLM output is garbage", () => {
    const garbageLlm = [
      { label: "Stück", amount: 169 },
      { label: "Endpreis", amount: 41.04 },
    ];
    expect(isGarbageWorkshopLineItems(garbageLlm)).toBe(true);

    const llmLineItems =
      resolveWorkshopLineItems({ llmItems: garbageLlm, ocrText: SPEEDWORKZ_OCR_TEXT }) ??
      garbageLlm;

    expect(llmLineItems).toHaveLength(5);
    expect(llmLineItems.some((item) => item.label === "Ersatzteile")).toBe(true);
    expect(llmLineItems.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(
      SPEEDWORKZ_NET_SUM,
      2,
    );
  });

  it("uses plausibility reconciliation for unknown/simple Pos lists", () => {
    const simplePosOcr = [
      "Pos Bezeichnung Betrag",
      "1 Sportfedern H&R 480,00",
      "2 Arbeitslohn 95,00",
      "Nettosumme 575,00",
      "Gesamtbetrag 684,25",
    ].join("\n");

    const shiftedLlm = [
      { label: "Sportfedern H&R", amount: 120 },
      { label: "Arbeitslohn", amount: 95 },
    ];

    const reconciled = reconcileInvoicePlausibility({
      lineItems: shiftedLlm,
      amount: 684.25,
      ocrText: simplePosOcr,
      enableRealign: false,
      enableOcrReconcile: true,
    });

    expect(reconciled.lineItems).toEqual([
      { label: "Sportfedern H&R", amount: 480 },
      { label: "Arbeitslohn", amount: 95 },
    ]);
  });
});
