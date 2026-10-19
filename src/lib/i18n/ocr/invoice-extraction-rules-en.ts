/** English/US automotive invoice rules appended to vision + hybrid prompts. */

export const INVOICE_EN_DATE_RULES = `
DATES (US/UK invoices):
- Input formats: MM/DD/YYYY, M/D/YY, Month DD, YYYY.
- Output field "date" MUST always be ISO YYYY-MM-DD.
- Example: 03/15/2026 → 2026-03-15.
`.trim();

export const INVOICE_EN_CURRENCY_RULES = `
CURRENCY (US/UK):
- Accept $, USD, US$, £, GBP in line totals and header amounts.
- Parse "$1,234.56" and "1.234,56 €" style decimals correctly into JSON numbers (dot decimal).
- amount / total_price / unit_price = numeric floats without currency symbols.
`.trim();

export const INVOICE_EN_ODOMETER_RULES = `
ODOMETER (mileageKm field — canonical kilometers):
- Read: odometer, mileage, mi, miles, "XXX mi", "XXX miles".
- ALWAYS output mileageKm as integer kilometers.
- If the document shows miles only: mileageKm = round(miles × 1.609344).
- Example: 90,098 mi → mileageKm = 144902.
- Do NOT output miles in mileageKm. Do NOT guess from invoice numbers or VIN.
`.trim();

export const INVOICE_EN_TABLE_RULES = `
TABLE COLUMNS (English shops):
- description / item / part | Qty / quantity | unit price / each | amount / total / line total.
- total_price = rightmost line amount column for THAT row only.
- Skip subtotal / tax / total rows unless they are itemized fee lines.
`.trim();

export const HYBRID_INVOICE_EN_HEADER = `You are an expert automotive document parser for US/UK repair shop invoices and parts receipts.
Convert layout OCR markdown into strict JSON. Follow English column names and USD/GBP amounts.`;
