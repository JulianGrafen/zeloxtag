# Phase 2 — Auth & Guideline 4.8

## Implementiert im Repo

- **Sign in with Apple** + Google + E-Mail ([`oauth-providers.ts`](../../src/lib/auth/oauth-providers.ts), [`OAuthProviderButtons`](../../src/components/auth/oauth-provider-buttons.tsx))
- Supabase: Apple Provider in Dashboard aktivieren (Services ID / Secret je nach Setup)

## QA in der iOS WebView (TestFlight)

- [ ] Registrierung / Login per E-Mail
- [ ] **Mit Apple fortfahren** → `/auth/callback` → Session
- [ ] **Mit Google fortfahren** → Callback → Session
- [ ] MFA `/login/mfa` falls aktiv
- [ ] Passwort-Reset / Bestätigungs-Mail: Links auf `https://app.zeloxtag.de`

## Exit

Test-Account + OAuth ohne hängenden Browser; Screenshots für App Review.
