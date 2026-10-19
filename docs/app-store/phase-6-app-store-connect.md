# Phase 6 — App Store Connect Metadaten

## Listing (DE)

- **Fokus:** QR-Fahrzeugdossier, Garage, Belege, Showcase — kein reiner „Website-Wrapper“.
- Untertitel, Beschreibung, Keywords

## Screenshots

- iPhone 6,7" (Pflicht)
- Optional iPad (Orientierungen in [`Info.plist`](../../ios/App/App/Info.plist))

## App Privacy (Nutrition Labels)

Abgleich mit [`/datenschutz`](https://app.zeloxtag.de/datenschutz): E-Mail, Nutzerinhalte (Fahrzeug/Fotos/PDFs), Käufe, Diagnose.

## Pflicht-URLs

- Support-URL (z. B. `mailto:support@zeloxtag.de` oder Hilfe-Seite)
- Marketing-URL

## Altersfreigabe

Fragebogen in ASC ausfüllen.

## Review Notes (Vorlage)

```
Demo-Account:
  E-Mail: review@…
  Passwort: …

Hybrid-App: native Kamera, Haptics, IAP (RevenueCat); Inhalt von https://app.zeloxtag.de.
Login: E-Mail, Google, Sign in with Apple.
Optional Test-QR: /v/<tag-uuid>
Restore Purchases: Einstellungen → Käufe wiederherstellen.
Account löschen: Einstellungen → Gefahrzone.
```

## Exit

Alle ASC-Pflichtfelder grün; Build an Version gehängt.
