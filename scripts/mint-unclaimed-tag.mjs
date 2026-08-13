/**
 * Mint a fresh unclaimed ZeloxTag + optional QR PNG for physical plaques.
 *
 * Usage:
 *   npm run db:mint-tag
 *   npm run db:mint-tag -- --qr
 */

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import QRCode from "qrcode";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const siteUrl = (
  process.env.MINT_QR_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "https://app.zeloxtag.de"
).replace(/\/$/, "");
const withQr = process.argv.includes("--qr");

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function mintTag() {
  const uuid = randomUUID();
  const response = await fetch(`${url}/rest/v1/tags`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      uuid,
      status: "unclaimed",
      vehicle_id: null,
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : JSON.stringify(body);
    throw new Error(`Mint failed (${response.status}): ${message}`);
  }

  const row = Array.isArray(body) ? body[0] : body;
  return {
    id: row?.id ?? null,
    uuid: row?.uuid ?? uuid,
  };
}

async function writeQrPng(uuid, scanUrl) {
  const outDir = path.join(process.cwd(), "public", "qr");
  await mkdir(outDir, { recursive: true });
  const filename = `zeloxtag-${uuid}.png`;
  const outPath = path.join(outDir, filename);
  await QRCode.toFile(outPath, scanUrl, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
  return { outPath, filename };
}

try {
  const minted = await mintTag();
  const scanUrl = `${siteUrl}/v/${minted.uuid}`;

  console.log("✓ Unclaimed tag minted");
  console.log(`  UUID:     ${minted.uuid}`);
  console.log(`  Scan URL: ${scanUrl}`);

  if (withQr) {
    const { outPath, filename } = await writeQrPng(minted.uuid, scanUrl);
    console.log(`  QR PNG:   public/qr/${filename}`);
    console.log(`            (${outPath})`);
  } else {
    console.log("  Tip: npm run db:mint-tag -- --qr  → saves PNG under public/qr/");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
