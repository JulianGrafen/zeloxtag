/**
 * Log in via the real UI and export cookies for OWASP ZAP (Playwright).
 *
 * Required env:
 *   ZAP_AUTH_EMAIL, ZAP_AUTH_PASSWORD
 * Optional:
 *   ZAP_TARGET (default http://127.0.0.1:3000)
 *   ZAP_AUTH_TOTP — 6-digit code when MFA is enabled on the account
 *   ZAP_TAG_UUID — if set, visits owner settings after login
 *   ZAP_AUTH_SEED_PATHS — comma-separated paths to warm (e.g. /garage,/account)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sessionDir = join(root, ".zap", "session");
const cookieFile = join(sessionDir, "cookies.json");

const target = (process.env.ZAP_TARGET ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const email = process.env.ZAP_AUTH_EMAIL?.trim();
const password = process.env.ZAP_AUTH_PASSWORD;

if (!email || !password) {
  console.error(
    "Set ZAP_AUTH_EMAIL and ZAP_AUTH_PASSWORD (dedicated scan account, MFA off or ZAP_AUTH_TOTP set).",
  );
  process.exit(1);
}

const seedPaths = (
  process.env.ZAP_AUTH_SEED_PATHS ??
  (process.env.ZAP_TAG_UUID
    ? `/v/${process.env.ZAP_TAG_UUID}/einstellungen`
    : "")
)
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

mkdirSync(sessionDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

console.log(`Login → ${target}`);

await page.goto(`${target}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
await page.getByRole("tab", { name: "Anmelden" }).click();
await page.locator("#login-email").fill(email);
await page.locator("#login-password").fill(password);
await page.getByRole("button", { name: "Anmelden", exact: true }).click();

function hasAuthCookies(cookies) {
  return cookies.some(
    (c) => c.name.includes("auth-token") || c.name.startsWith("sb-"),
  );
}

const deadline = Date.now() + 90_000;
let authed = false;
while (Date.now() < deadline) {
  if (page.url().includes("/login/mfa")) {
    const totp = process.env.ZAP_AUTH_TOTP?.replace(/\D/g, "").slice(0, 6);
    if (!totp || totp.length !== 6) {
      console.error(
        "Account requires MFA. Set ZAP_AUTH_TOTP or use a scan-only user without 2FA.",
      );
      await browser.close();
      process.exit(1);
    }
    await page.getByPlaceholder("000000").fill(totp);
    await page.getByRole("button", { name: "Bestätigen" }).click();
    await page.waitForTimeout(1_000);
    continue;
  }

  const cookies = await context.cookies();
  if (hasAuthCookies(cookies)) {
    authed = true;
    break;
  }

  const alert = await page
    .locator('[role="alert"]')
    .first()
    .textContent()
    .catch(() => null);
  if (alert?.trim()) {
    console.error("Login failed:", alert.trim());
    await browser.close();
    process.exit(1);
  }
  await page.waitForTimeout(500);
}

if (!authed) {
  console.error("Login did not complete. URL:", page.url());
  await browser.close();
  process.exit(1);
}

try {
  await page.goto(`${target}/auth/continue`, {
    waitUntil: "commit",
    timeout: 120_000,
  });
} catch {
  // Redirect chains during continue can abort navigation; cookies are already set.
}
await page.waitForTimeout(1_000);

console.log("Logged in at", page.url());

for (const path of seedPaths) {
  const url = path.startsWith("http") ? path : `${target}${path.startsWith("/") ? path : `/${path}`}`;
  console.log("Seed", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
}

const cookies = await context.cookies();
writeFileSync(
  cookieFile,
  JSON.stringify({ target, exportedAt: new Date().toISOString(), cookies }, null, 2),
);

await browser.close();

console.log(`Wrote ${cookies.length} cookies → ${cookieFile}`);
