# Platform Module 1b — RevenueCat → Supabase (follow-up)

Module 1 ships the **client** RevenueCat adapter only. Store review and account continuity require a **trusted server sync**.

## Recommended scope

1. **Migration** — extend `memberships.billing_provider` enum with `revenuecat`; add `revenuecat_app_user_id` (text, nullable, indexed).
2. **Webhook** — `POST /api/billing/revenuecat/webhook` verify `Authorization` / `REVENUECAT_WEBHOOK_SECRET`, map events (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`) to `memberships` rows keyed by Supabase `user_id` (= RevenueCat `app_user_id`).
3. **Entitlement source** — treat webhook-updated membership as authoritative; never grant Pro from client-only RC responses.
4. **Restore flow** — after `Purchases.restorePurchases()` on native, call a thin authenticated route that re-fetches RC subscriber info server-side (REST API) and reconciles DB.
5. **Stripe coexistence** — users who subscribed on web keep `billing_provider = stripe`; native users use `revenuecat`. `isMembershipProEntitled` stays provider-agnostic.

## Security

- Validate webhook signatures.
- Rate-limit restore/sync endpoints.
- Scope all writes with service role + verified `user_id`.
