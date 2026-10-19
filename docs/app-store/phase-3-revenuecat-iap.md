# Phase 3 — RevenueCat & In-App-Abo

## App Store Connect

- [ ] Paid Apps Agreement + Banking/Steuer
- [ ] Auto-Renewable Subscriptions (monatlich/jährlich) — Product IDs dokumentieren
- [ ] Sandbox-Tester

## RevenueCat

- [ ] iOS-App mit Bundle `de.zeloxtag.app`
- [ ] Offering + Packages (`monthly` / `yearly` oder Env, siehe [`revenuecat-config.ts`](../../src/lib/billing/revenuecat-config.ts))
- [ ] Webhook URL: `https://app.zeloxtag.de/api/billing/revenuecat/webhook`
- [ ] Webhook Authorization Secret → **`REVENUECAT_WEBHOOK_SECRET`** (Vercel)
- [ ] REST API Secret → **`REVENUECAT_SECRET_API_KEY`** (Vercel, nur Server)

## Vercel / Production Web (für WebView-Bundle)

| Variable | Zweck |
|----------|--------|
| `NEXT_PUBLIC_BILLING_NATIVE_ENABLED` | `1` |
| `NEXT_PUBLIC_REVENUECAT_IOS_KEY` | Public SDK Key |
| `NEXT_PUBLIC_API_BASE_URL` | `https://app.zeloxtag.de` |
| `REVENUECAT_ENTITLEMENT_ID` | optional, Default `pro` |

## Server (Repo)

- Migration [`00095_membership_revenuecat.sql`](../../supabase/migrations/00095_membership_revenuecat.sql)
- Webhook: `POST /api/billing/revenuecat/webhook`
- Nach Kauf/Restore: `POST /api/billing/revenuecat/sync` (Session)

## Exit

Sandbox-Kauf → Pro in App **und** `memberships` (provider `revenuecat`); Restore auf zweitem Gerät; Kündigung/Expiry via Webhook.
