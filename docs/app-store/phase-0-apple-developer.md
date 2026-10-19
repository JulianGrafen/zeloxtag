# Phase 0 — Apple Developer & App-Identität

## Checkliste

- [ ] **Apple Developer Program** aktiv (Organisation oder Individual) — **Team ID** notieren (10 Zeichen).
- [ ] **App Store Connect:** App mit Bundle ID **`de.zeloxtag.app`** anlegen (muss [`CAPACITOR_APP_ID`](../../src/lib/capacitor/app-link-config.ts) entsprechen).
- [ ] **Identifiers → App ID `de.zeloxtag.app`:**
  - [ ] Associated Domains
  - [ ] Sign in with Apple
  - [ ] In-App Purchase
- [ ] **Xcode:** `npm run cap:ios` → Target **App** → **Signing & Capabilities** → Team, Automatic Signing.
- [ ] **Version:** `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in [`project.pbxproj`](../../ios/App/App.xcodeproj/project.pbxproj) pro Upload erhöhen.
- [ ] **App Icon:** 1024×1024 in [`Assets.xcassets`](../../ios/App/App/Assets.xcassets).

## Exit

**Product → Archive** ohne Signing-Fehler.
