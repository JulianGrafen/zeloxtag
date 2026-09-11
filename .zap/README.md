# OWASP ZAP

## CI

Pull requests to `main` run a **baseline** scan via [`.github/workflows/owasp-zap.yml`](../.github/workflows/owasp-zap.yml). Reports are uploaded as workflow artifacts (`zap-baseline-report.html` / `.json`).

## Local scan

1. Build and start the app on port 3000:

   ```bash
   npm run build
   npm run start -- --port 3000
   ```

2. In another terminal:

   ```bash
   npm run security:zap
   ```

   Reports land in `.zap/reports/` (gitignored).

Override target URL:

```bash
ZAP_TARGET=http://127.0.0.1:3000 npm run security:zap
```

On Linux without `host.docker.internal`, use `ZAP_TARGET=http://172.17.0.1:3000` or the host IP.

## Authenticated baseline

Uses Playwright to log in like a real user, exports cookies, then runs `zap-baseline.py` with a hook that loads them into ZAP’s HTTP session.

**Requirements:** dedicated scan account (prefer **no MFA**), `ZAP_AUTH_EMAIL` + `ZAP_AUTH_PASSWORD`. If MFA is on, set `ZAP_AUTH_TOTP` for the run.

```bash
# Local (app on :3000) — bind 127.0.0.1 so ZAP in Docker does not follow redirects to 0.0.0.0
NEXT_PUBLIC_SITE_URL=http://host.docker.internal:3000 \
  npm run start -- --port 3000 --hostname 127.0.0.1

export ZAP_AUTH_EMAIL="scan@example.com"
export ZAP_AUTH_PASSWORD="…"
export ZAP_TAG_UUID="your-tag-uuid"   # optional: warm /v/{uuid}/einstellungen
ZAP_TARGET=http://host.docker.internal:3000 npm run security:zap:auth
```

Demo stack: `npm run db:seed-demo` then `demo@zeloxtag.local` / `zeloxtag-demo-password` and `ZAP_TAG_UUID=demo-active-tag`.

Production (dedicated scan user in `.env`, not your personal MFA account if avoidable):

```bash
# .env (gitignored):
# ZAP_AUTH_EMAIL=security-scan@…
# ZAP_AUTH_PASSWORD=…
# ZAP_TAG_UUID=zlx-…          # optional: owner settings subtree
# ZAP_AUTH_TOTP=123456        # only if 2FA enabled on scan user

npm run security:zap:auth
```

Default `ZAP_TARGET` for `security:zap:auth` is `https://app.zeloxtag.de`.

Cookie export only:

```bash
npm run security:zap:auth:export-cookies
```

Tune spider time: `ZAP_SPIDER_MINS=5`.

## Active scan (spider + attack rules)

**Not a manual pentest** — automated ZAP active rules (SQLi/XSS probes, etc.). Can stress the app and hit rate limits.

```bash
# Staging recommended. Production requires explicit opt-in:
ZAP_ALLOW_PROD_ACTIVE=1 ZAP_SPIDER_MINS=5 ZAP_ACTIVE_MINS=30 ZAP_MAX_TIME_MINS=90 npm run security:zap:active
```

Uses the same Playwright login + cookie hook as `security:zap:auth`.

## IDOR probe (dual account)

Automated checks: attacker session must **not** read another user’s vehicle APIs or owner pages.

```bash
# .env: ZAP_AUTH_* (owner), ZAP_IDOR_ATTACKER_*, ZAP_TAG_UUID
ZAP_TARGET=https://app.zeloxtag.de npm run security:idor
```

Report: `.zap/reports/idor-scan-*.json`

## Tuning

- **Response headers:** HTML routes get CSP + isolation headers in `src/proxy.ts` / `src/lib/security/csp.ts`. `/_next/static`, `sw.js`, and other Proxy-excluded paths get baseline headers via `next.config.ts` (`poweredByHeader: false` suppresses `X-Powered-By`).
- Add or extend `.zap/rules.tsv` to ignore known false positives (ZAP context file format). Local/auth/active scripts pass `-c .zap/rules.tsv` when the file exists.
