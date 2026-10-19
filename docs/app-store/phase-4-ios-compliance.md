# Phase 4 — iOS Compliance

## Privacy Manifest

[`ios/App/App/PrivacyInfo.xcprivacy`](../../ios/App/App/PrivacyInfo.xcprivacy) — im Xcode-Target **App** unter Copy Bundle Resources prüfen (nach `cap sync`).

## Export Encryption

[`Info.plist`](../../ios/App/App/Info.plist): `ITSAppUsesNonExemptEncryption` = `false` (nur Standard-TLS).

## Native Build Env

Vor Archive: Production-Env mit `NEXT_PUBLIC_API_BASE_URL=https://app.zeloxtag.de` — siehe [`docs/platform-module-5.md`](../platform-module-5.md).

```bash
npm run cap:sync
```

## Exit

Xcode **Validate App** ohne Privacy-Manifest-Fehler; Archive upload-fähig.
