/**
 * Playwright UI login → Cookie header string for fetch probes.
 */
import { chromium } from "playwright";

const UUID_IN_PAGE =
  /"vehicleId":"([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})"/i;

export async function loginAndGetCookieHeader({
  target,
  email,
  password,
  totp,
  seedPath,
}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${target}/`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByRole("tab", { name: "Anmelden" }).click();
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.waitForTimeout(300);
  const pwdLen = await page.locator("#login-password").inputValue();
  if (pwdLen.length < 10) {
    await page.locator("#login-password").fill(password);
  }
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();

  const deadline = Date.now() + 90_000;
  let authed = false;
  while (Date.now() < deadline) {
    if (page.url().includes("/login/mfa")) {
      const code = totp?.replace(/\D/g, "").slice(0, 6);
      if (!code || code.length !== 6) {
        throw new Error("MFA required; set ZAP_AUTH_TOTP or ZAP_IDOR_ATTACKER_TOTP");
      }
      await page.getByPlaceholder("000000").fill(code);
      await page.getByRole("button", { name: "Bestätigen" }).click();
      await page.waitForTimeout(1_000);
      continue;
    }
    const cookies = await context.cookies();
    if (cookies.some((c) => c.name.includes("auth-token") || c.name.startsWith("sb-"))) {
      authed = true;
      break;
    }
    await page.waitForTimeout(500);
  }
  if (!authed) {
    const alert = await page
      .locator('[role="alert"]')
      .first()
      .textContent()
      .catch(() => null);
    await browser.close();
    throw new Error(
      `Login failed for ${email}${alert?.trim() ? `: ${alert.trim()}` : ""} (URL: ${page.url()})`,
    );
  }

  if (seedPath) {
    try {
      await page.goto(`${target}${seedPath}`, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
    } catch {
      /* redirect chains */
    }
  }

  const cookies = await context.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  await browser.close();
  return cookieHeader;
}

export async function discoverVehicleId({ target, tagUuid, cookieHeader }) {
  const res = await fetch(`${target}/v/${tagUuid}/einstellungen`, {
    headers: { cookie: cookieHeader, accept: "text/html" },
    redirect: "follow",
  });
  const html = await res.text();
  const match = html.match(UUID_IN_PAGE);
  if (match?.[1]) return match[1];

  const loose = html.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/gi,
  );
  if (loose?.length) {
    const tagLower = tagUuid.toLowerCase();
    const candidate = loose.find((id) => id.toLowerCase() !== tagLower);
    if (candidate) return candidate;
  }
  return null;
}
