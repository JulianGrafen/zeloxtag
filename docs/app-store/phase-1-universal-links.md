# Phase 1 — Universal Links

## 1. Vercel Production

Setze **`APPLE_TEAM_ID`** = deine Apple Team ID → redeploy.

## 2. Verifizieren

```bash
curl -s https://app.zeloxtag.de/.well-known/apple-app-site-association | jq .
```

Erwartung: `applinks.details[0].appID` = `"<TEAM_ID>.de.zeloxtag.app"` und Paths wie `/v/*`, `/auth/*` ([`UNIVERSAL_LINK_PATHS`](../../src/lib/capacitor/app-link-config.ts)).

Route: [`src/app/.well-known/apple-app-site-association/route.ts`](../../src/app/.well-known/apple-app-site-association/route.ts).

## 3. Apple Developer

Associated Domains auf App ID; Provisioning Profile neu erzeugen. Entitlements: [`ios/App/App/App.entitlements`](../../ios/App/App/App.entitlements) → `applinks:app.zeloxtag.de`.

## 4. Gerätetest

Link `https://app.zeloxtag.de/v/<tag-uuid>` aus Mail/Notizen — **ZeloxTag-App** öffnet Route in der WebView ([`useCapacitorDeepLink`](../../src/hooks/useCapacitorDeepLink.ts)).

## Exit

QR-/Tag-Flow aus [`docs/capacitor.md`](../capacitor.md) auf physischem iPhone OK.
