export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildTransactionalEmailHtml(input: {
  kicker?: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  afterCtaHtml?: string;
  footerNote?: string;
  signOffHtml?: string;
}): string {
  const safeUrl = escapeHtml(input.ctaUrl);
  const kicker = input.kicker
    ? `<p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;">${escapeHtml(input.kicker)}</p>`
    : `<p style="margin:0 0 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;">ZeloxTag</p>`;
  const afterCta = input.afterCtaHtml
    ? `<div style="margin:16px 0 0;font-size:14px;line-height:1.55;color:#52525b;">${input.afterCtaHtml}</div>`
    : "";
  const footer = input.footerNote
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">${input.footerNote}</p>`
    : "";
  const signOff = input.signOffHtml
    ? `<div style="margin:20px 0 0;font-size:14px;line-height:1.55;color:#52525b;">${input.signOffHtml}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:20px;padding:28px 24px;">
          <tr>
            <td>
              ${kicker}
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;color:#18181b;">${escapeHtml(input.headline)}</h1>
              <div style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#52525b;">
                ${input.bodyHtml}
              </div>
              <a href="${safeUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 18px;border-radius:12px;">
                ${escapeHtml(input.ctaLabel)}
              </a>
              ${afterCta}
              <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                Falls der Button nicht funktioniert:<br />
                <span style="word-break:break-all;color:#71717a;">${safeUrl}</span>
              </p>
              ${footer}
              ${signOff}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
