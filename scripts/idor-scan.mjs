/**
 * Dual-account IDOR probe against production (or ZAP_TARGET).
 *
 * Owner: ZAP_AUTH_EMAIL / ZAP_AUTH_PASSWORD
 * Attacker: ZAP_IDOR_ATTACKER_EMAIL / ZAP_IDOR_ATTACKER_PASSWORD
 * Victim tag: ZAP_TAG_UUID
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverVehicleId, loginAndGetCookieHeader } from "./idor-login.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = (process.env.ZAP_TARGET ?? "https://app.zeloxtag.de").replace(
  /\/$/,
  "",
);
const tagUuid = process.env.ZAP_TAG_UUID?.trim();

const ownerEmail = process.env.ZAP_AUTH_EMAIL?.trim();
const ownerPassword = process.env.ZAP_AUTH_PASSWORD;
const attackerEmail = process.env.ZAP_IDOR_ATTACKER_EMAIL?.trim();
const attackerPassword = process.env.ZAP_IDOR_ATTACKER_PASSWORD;

if (!ownerEmail || !ownerPassword || !attackerEmail || !attackerPassword) {
  console.error(
    "Set ZAP_AUTH_* (owner) and ZAP_IDOR_ATTACKER_* (second account) in .env",
  );
  process.exit(1);
}
if (!tagUuid) {
  console.error("Set ZAP_TAG_UUID (victim tag) in .env");
  process.exit(1);
}

const ownerTotp = process.env.ZAP_AUTH_TOTP;
const attackerTotp = process.env.ZAP_IDOR_ATTACKER_TOTP;

async function discoverIsPublicShowcase({ target, tagUuid, cookieHeader }) {
  const res = await fetch(`${target}/v/${tagUuid}/einstellungen`, {
    headers: { cookie: cookieHeader, accept: "text/html" },
    redirect: "follow",
  });
  const html = await res.text();
  return (
    /"is_public"\s*:\s*true/i.test(html) ||
    /"isPublic"\s*:\s*true/i.test(html)
  );
}

/** @type {Array<{ id: string; name: string; method: string; url: string; expectBlocked: boolean; note?: string }>} */
function buildProbes(vehicleId, tag, { isPublicShowcase }) {
  const fakeDocPath = `${vehicleId}/00000000-0000-4000-8000-000000000001-probe.pdf`;
  return [
    {
      id: "silhouette",
      name: "Vehicle silhouette image",
      method: "GET",
      url: `${target}/api/vehicle/silhouette/${vehicleId}`,
      expectBlocked: !isPublicShowcase,
      note: isPublicShowcase
        ? "Public showcase: any session may read media (sessionCanAccessVehicleMedia)."
        : undefined,
    },
    {
      id: "dyno-chart",
      name: "Private dyno chart",
      method: "GET",
      url: `${target}/api/vehicle/dyno-chart/${vehicleId}`,
      expectBlocked: true,
    },
    {
      id: "engine-sound",
      name: "Engine sound preview",
      method: "GET",
      url: `${target}/api/vehicle/engine-sound/${vehicleId}`,
      expectBlocked: true,
    },
    {
      id: "expose-pdf",
      name: "Owner expose PDF",
      method: "GET",
      url: `${target}/api/vehicles/${vehicleId}/expose`,
      expectBlocked: true,
    },
    {
      id: "document-file-path",
      name: "Document proxy by storage path",
      method: "GET",
      url: `${target}/api/documents/file?path=${encodeURIComponent(fakeDocPath)}`,
      expectBlocked: true,
    },
    {
      id: "public-file-private",
      name: "Public showcase file proxy (non-public vehicle)",
      method: "GET",
      url: `${target}/api/public/vehicle/${vehicleId}/file?src=${encodeURIComponent(`${vehicleId}/probe.jpg`)}`,
      expectBlocked: true,
    },
    {
      id: "owner-settings-page",
      name: "Owner settings HTML",
      method: "GET",
      url: `${target}/v/${tag}/einstellungen`,
      expectBlocked: true,
    },
    {
      id: "owner-upload-page",
      name: "Upload surface",
      method: "GET",
      url: `${target}/v/${tag}/hochladen`,
      expectBlocked: true,
    },
  ];
}

function isBlockedResponse(probe, response, bodySnippet) {
  const { status, headers } = response;
  const type = headers.get("content-type") ?? "";

  if (status === 401 || status === 403 || status === 404) return true;

  if (probe.id === "expose-pdf" && status === 200) {
    return !type.includes("pdf");
  }
  if (
    (probe.id === "silhouette" || probe.id === "dyno-chart" || probe.id === "engine-sound") &&
    status === 200
  ) {
    return !type.startsWith("image/") && !type.includes("audio");
  }
  if (probe.id === "document-file-path" && status === 200) {
    return !type.includes("pdf") && bodySnippet.length < 500;
  }

  if (probe.id === "owner-settings-page" || probe.id === "owner-upload-page") {
    if (status >= 300 && status < 400) return true;
    if (status === 200) {
      const lower = bodySnippet.toLowerCase();
      const ownerOnly =
        lower.includes("einstellungen") &&
        lower.includes("öffentliches profil") &&
        !lower.includes("melde dich an");
      return !ownerOnly;
    }
  }

  if (status === 200 && probe.expectBlocked) {
    return bodySnippet.length < 200;
  }

  return status !== 200;
}

async function runProbe(probe, cookieHeader) {
  const response = await fetch(probe.url, {
    method: probe.method,
    headers: {
      cookie: cookieHeader,
      accept: "*/*",
    },
    redirect: "manual",
  });
  const body = await response.text().catch(() => "");
  const snippet = body.slice(0, 4_000);
  const blocked = isBlockedResponse(probe, response, snippet);
  return {
    ...probe,
    status: response.status,
    contentType: response.headers.get("content-type"),
    location: response.headers.get("location"),
    blocked,
    pass: probe.expectBlocked ? blocked : true,
    bodyBytes: body.length,
  };
}

console.log(`IDOR scan → ${target}`);
console.log(`Victim tag → ${tagUuid}`);

console.log("Logging in owner (resource discovery)…");
const ownerCookie = await loginAndGetCookieHeader({
  target,
  email: ownerEmail,
  password: ownerPassword,
  totp: ownerTotp,
  seedPath: `/v/${tagUuid}/einstellungen`,
});

let vehicleId = process.env.ZAP_IDOR_VEHICLE_ID?.trim() || null;
if (!vehicleId) {
  vehicleId = await discoverVehicleId({
    target,
    tagUuid,
    cookieHeader: ownerCookie,
  });
}
if (!vehicleId) {
  console.error("Could not resolve vehicleId; set ZAP_IDOR_VEHICLE_ID in .env");
  process.exit(1);
}
console.log(`Victim vehicleId → ${vehicleId}`);

const isPublicShowcase = await discoverIsPublicShowcase({
  target,
  tagUuid,
  cookieHeader: ownerCookie,
});
const anonSilhouette = await fetch(
  `${target}/api/vehicle/silhouette/${vehicleId}`,
  { method: "GET", redirect: "manual" },
);
const publicSilhouetteMedia = anonSilhouette.status === 200;
const silhouetteIsWorldReadable =
  isPublicShowcase || publicSilhouetteMedia;
console.log(
  `Victim is_public (HTML) → ${isPublicShowcase}; silhouette anonymous → ${anonSilhouette.status}`,
);

if (ownerEmail.toLowerCase() === attackerEmail.toLowerCase()) {
  console.error("Owner and attacker must be different accounts.");
  process.exit(1);
}

console.log("Logging in attacker…");
const attackerCookie = await loginAndGetCookieHeader({
  target,
  email: attackerEmail,
  password: attackerPassword,
  totp: attackerTotp,
});

const probes = buildProbes(vehicleId, tagUuid, {
  isPublicShowcase: silhouetteIsWorldReadable,
});
const results = [];
for (const probe of probes) {
  const result = await runProbe(probe, attackerCookie);
  results.push(result);
  const mark = result.pass ? "PASS" : "FAIL";
  console.log(
    `${mark} [${probe.id}] HTTP ${result.status} ${result.contentType ?? ""}`.trim(),
  );
}

const failed = results.filter((r) => !r.pass);
const report = {
  scannedAt: new Date().toISOString(),
  target,
  tagUuid,
  vehicleId,
  isPublicShowcase,
  publicSilhouetteMedia,
  silhouetteIsWorldReadable,
  summary: {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: failed.length,
  },
  results: results.map(({ pass, blocked, ...rest }) => ({
    ...rest,
    pass,
    blocked,
  })),
};

const reportDir = join(root, ".zap", "reports");
mkdirSync(reportDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
const reportPath = join(reportDir, `idor-scan-${stamp}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\nReport → ${reportPath}`);
if (failed.length) {
  console.error(`\n${failed.length} IDOR probe(s) FAILED:`);
  for (const f of failed) {
    console.error(`  - ${f.id}: ${f.url} → ${f.status}`);
  }
  process.exit(2);
}
console.log("All IDOR probes passed (attacker blocked).");
