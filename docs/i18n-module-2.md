# i18n Module 2 — Language & regional units

## Supported locales

- `de` — EUR, km, PS, German product terms
- `en` — USD or GBP (user toggle), miles, HP, US/UK product terms

Canonical DB fields stay **km**, **PS**, and numeric amounts without currency code.

## Resolution order

1. `user.user_metadata.app_locale` and `en_currency`
2. Cookies `zt_locale`, `zt_en_currency`
3. `Accept-Language` / browser languages
4. Default `de`

Server: `getRequestLocale()` / `getRequestLocalePreferences()` in [`src/lib/i18n/get-request-locale.ts`](../src/lib/i18n/get-request-locale.ts).

Client: `useLocale()` / `useRegionalFormatters()` via [`LocaleProvider`](../src/lib/i18n/context/locale-provider.tsx).

## Contributor rules

- Use `formatMoney`, `formatDistanceFromKm`, `formatPowerFromPs` — never hardcode `de-DE` / `€` / `km` / `PS` in new UI.
- Use `getTerm(key, locale)` for market-specific product copy (vault, receipts).
- Invoice OCR: pass `locale` into extraction services; extend prompts in [`src/lib/i18n/ocr/`](../src/lib/i18n/ocr/) only.
- Do not duplicate DE/EN strings in components — add keys to [`terminology.ts`](../src/lib/i18n/terminology.ts) or [`messages/`](../src/lib/i18n/messages/).

## User settings

`/settings/language` — persists to Supabase Auth metadata and cookies.

## OCR

[`buildHybridInvoiceSystemPrompt`](../src/lib/i18n/ocr/invoice-prompts.ts) and vision/header builders append EN rules for USD/GBP, MM/DD/YYYY, and miles→`mileageKm` conversion.
