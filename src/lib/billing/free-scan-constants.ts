import { MAX_FREE_FUEL_SCANS } from "@/lib/billing/subscription-config";

/** Complimentary KI invoice/service scans per vehicle owner account on Free. */
export const FREE_AI_INVOICE_SCAN_LIMIT = 2;

/** One complimentary KI ABE scan per vehicle owner account. */
export const FREE_AI_ABE_SCAN_LIMIT = 1;

/** Complimentary KI tank receipt scans per account on Free. */
export const FREE_AI_FUEL_SCAN_LIMIT = MAX_FREE_FUEL_SCANS;
