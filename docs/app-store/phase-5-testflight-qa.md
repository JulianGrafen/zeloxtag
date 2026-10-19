# Phase 5 — TestFlight QA

## Upload

Archive → Distribute → TestFlight (Internal → External).

## Checkliste (Build-Nummer notieren)

- [ ] Cold Start → Login/Dashboard lädt von Production
- [ ] E-Mail Registrierung / Login / MFA
- [ ] Google + **Sign in with Apple** OAuth
- [ ] Universal Link `/v/<uuid>` → in-app
- [ ] Claim + Kamera-Scan + Upload
- [ ] Entdecken / Swipe (DB-Migrationen applied)
- [ ] Story-Share (Foto-Berechtigungen)
- [ ] Einstellungen → Account löschen
- [ ] IAP Sandbox: Kauf + **Käufe wiederherstellen**
- [ ] WebView-Ladezeit akzeptabel; Offline klar kommunizieren

Basis: [`docs/capacitor.md`](../capacitor.md) Release checklist.

## Exit

Internes Sign-off (1 Seite: Flows + Build).
