/**
 * Sync pdfjs-dist worker into /public so the client can load it same-origin
 * (CSP blocks unpkg / external script-src).
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const targetDir = join(root, "public", "pdfjs");
const target = join(targetDir, "pdf.worker.min.mjs");

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
console.log(`Copied pdf.worker.min.mjs → ${target}`);
