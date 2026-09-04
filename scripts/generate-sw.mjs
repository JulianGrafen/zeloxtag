#!/usr/bin/env node
/**
 * Regenerates public/sw.js — minimal service worker for PWA installability.
 * Run: npm run generate:sw
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SW_SOURCE = `/* ZeloxTag minimal service worker — PWA installability only (no caching). */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
`;

const outPath = join(dirname(fileURLToPath(import.meta.url)), "../public/sw.js");
writeFileSync(outPath, SW_SOURCE, "utf8");
console.log(`Wrote ${outPath}`);
