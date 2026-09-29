import { MAX_FREE_FUEL_SCANS } from "@/lib/billing/subscription-config";

/** One complimentary KI invoice scan per vehicle owner account. */
export const FREE_AI_INVOICE_SCAN_LIMIT = 1;

/** One complimentary KI ABE scan per vehicle owner account. */
export const FREE_AI_ABE_SCAN_LIMIT = 1;

/** Complimentary KI tank receipt scans per account on Free. */
export const FREE_AI_FUEL_SCAN_LIMIT = MAX_FREE_FUEL_SCANS;
