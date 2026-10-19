# Phase 7 — Review & Release

## Einreichung

1. **Submit for Review** (Production)
2. Phased Release oder sofort nach Freigabe

## Typische Ablehnungen (Vorbereitung)

| Guideline | Antwort |
|-----------|---------|
| **4.2** Minimum Functionality | Native Kamera, IAP, Haptics, QR-Dossier — kein Bookmark zur Website |
| **4.8** Login | Sign in with Apple + Google + E-Mail dokumentiert |
| **3.1.1** IAP | Kein Stripe-Hinweis für digitales Pro **in der iOS-App** |
| **5.1.1** Privacy | Datenschutz, Account-Löschung in App |

## Nach Freigabe

- Monitoring: Vercel, Supabase, RevenueCat
- Web-Deploys aktualisieren WebView ohne App-Release (Remote URL)

## Rejection

Notes + Resolution Center; Fix auf Web oder native Shell je nach Befund; neuer Build nur wenn nötig.
