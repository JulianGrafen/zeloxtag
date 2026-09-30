import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";

import vitestConfig from "./vitest.config";

/**
 * CI / pre-build gate: full unit suite except invoice-OCR goldens that drift
 * independently of product deploys (covered partly by `test:extraction`).
 */
const OCR_GOLDEN_EXCLUDES = [
  "src/lib/ocr/invoice-line-item-alignment.test.ts",
  "src/lib/ocr/invoice-line-item-dedupe.test.ts",
  "src/lib/ocr/invoice-line-items-from-layout.test.ts",
  "src/lib/ocr/invoice-column-pipeline.test.ts",
  "src/lib/ocr/invoice-workshop-sections.test.ts",
  "src/services/ocr/gutachten-extraction.test.ts",
  "src/lib/billing/pro-plan.test.ts",
  "src/lib/documents/invoice-detail-edit.test.ts",
];

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        ...OCR_GOLDEN_EXCLUDES,
      ],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
      },
    },
  }),
);
