import { describe, expect, it } from "vitest";

import {
  SPEEDWORKZ_EXPECTED_LINE_ITEMS,
  SPEEDWORKZ_LLM_RAW_LINE_ITEMS,
  SPEEDWORKZ_NET_SUM,
  SPEEDWORKZ_OCR_TEXT,
} from "@/lib/ocr/fixtures/speedworkz-invoice-line-items";
import { mergeContinuationInvoiceLineItems } from "@/lib/ocr/invoice-line-item-alignment";
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
    for (let i = 0; i < SPEEDWORKZ_EXPECTED_LINE_ITEMS.length; i += 1) {
      expect(processed[i]!.gesamtpreis).toBeCloseTo(
        SPEEDWORKZ_EXPECTED_LINE_ITEMS[i]!.amount,
        2,
      );
    }
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

    expect(llmLineItems).toHaveLength(8);
    expect(llmLineItems.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(
      SPEEDWORKZ_NET_SUM,
      2,
    );
  });

  it("recovers the 8 Speedworkz positions from the camera-scan mega-merge pattern", () => {
    const garbledLlm = [
      {
        label: "Motor wird heiß lt. Kunde Thermostat wurde erneuert",
        amount: 46.22,
      },
      { label: "Wasserschlauch undicht", amount: 166.37 },
      {
        label:
          "Thermostat und Wasserschlauch erneuern Kühlmitteltemp.sensor prüfen und erneuern Wasserschlauch Thermostat Kühlerfrostschutz",
        amount: 70.83,
      },
      { label: "Sensor, Kühlmitteltemperatur Fracht", amount: 28.73 },
    ];

    const resolved =
      resolveWorkshopLineItems({
        llmItems: garbledLlm,
        ocrText: SPEEDWORKZ_OCR_TEXT,
      }) ?? garbledLlm;

    expect(resolved).toHaveLength(8);
    expect(resolved.reduce((sum, item) => sum + item.amount, 0)).toBeCloseTo(
      SPEEDWORKZ_NET_SUM,
      2,
    );
    expect(resolved.map((item) => item.label)).toEqual(
      SPEEDWORKZ_EXPECTED_LINE_ITEMS.map((item) => item.label),
    );
  });

  it("does not merge Speedworkz part names as Pos-table continuations", () => {
    const merged = mergeContinuationInvoiceLineItems(
      SPEEDWORKZ_EXPECTED_LINE_ITEMS,
    );
    expect(merged).toEqual(SPEEDWORKZ_EXPECTED_LINE_ITEMS);
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
