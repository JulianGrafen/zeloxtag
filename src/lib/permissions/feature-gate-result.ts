import {
  FREE_SCAN_EXHAUSTED_CODE,
  SUBSCRIPTION_REQUIRED_CODE,
} from "@/lib/permissions/feature-access";
import type { FeatureDenied } from "@/lib/permissions/require-feature";

export type FeatureGateErrorCode =
  | typeof SUBSCRIPTION_REQUIRED_CODE
  | typeof FREE_SCAN_EXHAUSTED_CODE;

/** Server-action equivalent of API 403 — blocks direct POST bypass of the paywall. */
export type FeatureForbiddenResult = {
  status: "forbidden";
  message: string;
  code: FeatureGateErrorCode;
};

export function featureDeniedToForbidden(
  denied: FeatureDenied,
): FeatureForbiddenResult {
  return {
    status: "forbidden",
    message: denied.message,
    code: denied.code,
  };
}

export function isFeatureGateFailure(result: {
  status: string;
}): result is FeatureForbiddenResult {
  return result.status === "forbidden";
}

/** Treat paywall blocks and validation errors uniformly in server-action clients. */
export function isActionFailure(result: { status: string }): boolean {
  return result.status === "error" || result.status === "forbidden";
}

export function actionFailureMessage(
  result: { status: string; message?: string },
): string | null {
  if (!isActionFailure(result)) return null;
  return typeof result.message === "string" ? result.message : null;
}
