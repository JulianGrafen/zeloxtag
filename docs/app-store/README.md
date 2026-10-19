# App Store Launch — ZeloxTag iOS

Schritt-für-Schritt-Playbooks für **`de.zeloxtag.app`** (Capacitor → [`https://app.zeloxtag.de`](https://app.zeloxtag.de)).

| Phase | Dokument | Repo / manuell |
|-------|----------|----------------|
| 0 | [Apple Developer Setup](./phase-0-apple-developer.md) | Manuell (Apple) |
| 1 | [Universal Links](./phase-1-universal-links.md) | `APPLE_TEAM_ID` auf Vercel |
| 2 | [Auth 4.8](./phase-2-auth-48.md) | Sign in with Apple im Code + Supabase |
| 3 | [RevenueCat & IAP](./phase-3-revenuecat-iap.md) | Migration `00095`, Webhook-Route |
| 4 | [iOS Compliance](./phase-4-ios-compliance.md) | `PrivacyInfo.xcprivacy`, `Info.plist` |
| 5 | [TestFlight QA](./phase-5-testflight-qa.md) | Gerät + Sandbox |
| 6 | [App Store Connect Metadaten](./phase-6-app-store-connect.md) | ASC |
| 7 | [Review & Release](./phase-7-review-playbook.md) | Einreichung |

Technische Basis: [`docs/capacitor.md`](../capacitor.md), [`docs/platform-module-1b.md`](../platform-module-1b.md).
