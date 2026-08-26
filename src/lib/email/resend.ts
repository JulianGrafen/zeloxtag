import { Resend } from "resend";

function readResendApiKey(): string {
  return process.env.RESEND_API_KEY?.trim() ?? "";
}

/** Strip accidental wrapping quotes from dashboard / .env pastes. */
function stripEnvQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * From address for Resend.
 * Prefer plain email + optional name (Vercel-safe):
 *   RESEND_FROM_EMAIL=noreply@yourdomain.com
 *   RESEND_FROM_NAME=ZeloxTag
 * Or full RFC form:
 *   RESEND_FROM_EMAIL=ZeloxTag <noreply@yourdomain.com>
 */
function readFromAddress(): string {
  const raw = stripEnvQuotes(process.env.RESEND_FROM_EMAIL ?? "");
  if (!raw) {
    return "ZeloxTag <onboarding@resend.dev>";
  }

  // Already "Name <email>" or bare email with angle brackets.
  if (raw.includes("<") && raw.includes(">")) {
    return raw;
  }

  const name = stripEnvQuotes(process.env.RESEND_FROM_NAME ?? "") || "ZeloxTag";
  // Bare email → add display name.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return `${name} <${raw}>`;
  }

  return raw;
}

export function isResendConfigured(): boolean {
  return Boolean(readResendApiKey());
}

function getResendClient(): Resend {
  const key = readResendApiKey();
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  return new Resend(key);
}

export async function sendMagicLinkEmail(input: {
  to: string;
  loginUrl: string;
  vehicleLabel?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isResendConfigured()) {
    return {
      ok: false,
      message: "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY).",
    };
  }

  const from = readFromAddress();
  const contextLine = input.vehicleLabel
    ? `Du wurdest eingeladen, Belege für ${input.vehicleLabel} einzutragen.`
    : "Du kannst dich ohne Passwort anmelden und Belege eintragen.";

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: "Anmelden · ZeloxTag Schrauber",
      html: buildMagicLinkHtml(input.loginUrl, input.vehicleLabel),
      text: [
        "Anmelden · ZeloxTag",
        "",
        contextLine,
        `Link (60 Minuten gültig): ${input.loginUrl}`,
        "",
        "Falls du das nicht angefordert hast, ignoriere diese E-Mail.",
      ].join("\n"),
    });

    if (error) {
      return {
        ok: false,
        message: `${error.message} (from: ${from})`,
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `${error.message} (from: ${from})`
          : `E-Mail konnte nicht gesendet werden. (from: ${from})`,
    };
  }
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isResendConfigured()) {
    return {
      ok: false,
      message: "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY).",
    };
  }

  const from = readFromAddress();

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: "Passwort zurücksetzen · ZeloxTag",
      html: buildPasswordResetHtml(input.resetUrl),
      text: [
        "Passwort zurücksetzen · ZeloxTag",
        "",
        "Du hast eine Zurücksetzung deines Passworts angefordert.",
        `Link (60 Minuten gültig): ${input.resetUrl}`,
        "",
        "Falls du das nicht warst, ignoriere diese E-Mail.",
      ].join("\n"),
    });

    if (error) {
      return {
        ok: false,
        message: `${error.message} (from: ${from})`,
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `${error.message} (from: ${from})`
          : `E-Mail konnte nicht gesendet werden. (from: ${from})`,
    };
  }
}

export async function sendMembershipClaimEmail(input: {
  to: string;
  claimUrl: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isResendConfigured()) {
    return {
      ok: false,
      message: "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY).",
    };
  }

  const from = readFromAddress();

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: "ZeloxTag Cloud freischalten",
      html: buildMembershipClaimHtml(input.claimUrl),
      text: [
        "ZeloxTag Cloud freischalten",
        "",
        "Deine Mitgliedschaft ist bezahlt. Öffne den Link angemeldet bei ZeloxTag.",
        "Die Shopify-Mail darf eine andere sein als dein Login.",
        input.claimUrl,
      ].join("\n"),
    });

    if (error) {
      return { ok: false, message: `${error.message} (from: ${from})` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? `${error.message} (from: ${from})`
          : `E-Mail konnte nicht gesendet werden. (from: ${from})`,
    };
  }
}

function buildMembershipClaimHtml(claimUrl: string): string {
  const safeUrl = escapeHtml(claimUrl);
  return `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:20px;padding:28px 24px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;">ZeloxTag</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#18181b;">Cloud-Mitgliedschaft bezahlt</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#52525b;">
                Tippe den Button in dem Konto, das die Cloud nutzen soll. Die Shopify-Mail darf eine andere sein als dein ZeloxTag-Login.
              </p>
              <a href="${safeUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 18px;border-radius:12px;">
                Mitgliedschaft verknüpfen
              </a>
              <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                Falls der Button nicht funktioniert:<br />
                <span style="word-break:break-all;color:#71717a;">${safeUrl}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildMagicLinkHtml(
  loginUrl: string,
  vehicleLabel?: string | null,
): string {
  const safeUrl = escapeHtml(loginUrl);
  const safeVehicle = vehicleLabel ? escapeHtml(vehicleLabel) : null;
  const intro = safeVehicle
    ? `Du wurdest eingeladen, Belege für <strong>${safeVehicle}</strong> einzutragen. Tippe den Button — kein Passwort nötig.`
    : "Tippe den Button, um dich ohne Passwort anzumelden und Belege einzutragen.";

  return `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:20px;padding:28px 24px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;">ZeloxTag · Schrauber</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#18181b;">Anmelden</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#52525b;">
                ${intro} Der Link ist etwa 60&nbsp;Minuten gültig.
              </p>
              <a href="${safeUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 18px;border-radius:12px;">
                Jetzt anmelden
              </a>
              <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                Falls der Button nicht funktioniert:<br />
                <span style="word-break:break-all;color:#71717a;">${safeUrl}</span>
              </p>
              <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPasswordResetHtml(resetUrl: string): string {
  const safeUrl = escapeHtml(resetUrl);
  return `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:20px;padding:28px 24px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;">ZeloxTag</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#18181b;">Passwort zurücksetzen</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#52525b;">
                Du hast eine Zurücksetzung angefordert. Der Link ist etwa 60&nbsp;Minuten gültig.
              </p>
              <a href="${safeUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 18px;border-radius:12px;">
                Neues Passwort wählen
              </a>
              <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                Falls der Button nicht funktioniert:<br />
                <span style="word-break:break-all;color:#71717a;">${safeUrl}</span>
              </p>
              <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
