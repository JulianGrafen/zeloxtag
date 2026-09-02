import type { VehicleWriteAccess } from "@/lib/auth/vehicle-write-access";
import { writeAccessErrorMessage } from "@/lib/auth/vehicle-write-access";
import {
  ownerCanUseAiAbeScan,
  ownerCanUseAiInvoiceScan,
  ownerHasFreeAbeScanRemaining,
  ownerHasFreeInvoiceScanRemaining,
} from "@/lib/billing/free-scan-quota";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { MEMBERSHIP_REQUIRED_MESSAGE } from "@/lib/billing/pro-plan";
import {
  FEATURE,
  FREE_SCAN_EXHAUSTED_CODE,
  SUBSCRIPTION_REQUIRED_CODE,
  hasFeatureAccess,
  resolveUserTier,
  type FeatureFlag,
  type UserTier,
} from "@/lib/permissions/feature-access";

export async function getOwnerTier(ownerUserId: string): Promise<UserTier> {
  if (!ownerUserId) return "free";
  return resolveUserTier(await userHasActiveMembership(ownerUserId));
}

export async function ownerHasFeature(
  ownerUserId: string,
  feature: FeatureFlag,
): Promise<boolean> {
  return hasFeatureAccess(await getOwnerTier(ownerUserId), feature);
}

export type FeatureDenied = {
  ok: false;
  code: typeof SUBSCRIPTION_REQUIRED_CODE | typeof FREE_SCAN_EXHAUSTED_CODE;
  message: string;
};

export type FeatureGateOptions = {
  /** Allow the vehicle owner's one free KI invoice scan. */
  allowFreeInvoiceScan?: boolean;
  /** Allow the vehicle owner's one free KI ABE scan. */
  allowFreeAbeScan?: boolean;
};

async function denyOwnerFeature(
  ownerUserId: string,
  options?: FeatureGateOptions,
): Promise<FeatureDenied> {
  if (
    options?.allowFreeInvoiceScan &&
    !(await ownerHasFreeInvoiceScanRemaining(ownerUserId))
  ) {
    return {
      ok: false,
      code: FREE_SCAN_EXHAUSTED_CODE,
      message: MEMBERSHIP_REQUIRED_MESSAGE,
    };
  }

  if (
    options?.allowFreeAbeScan &&
    !(await ownerHasFreeAbeScanRemaining(ownerUserId))
  ) {
    return {
      ok: false,
      code: FREE_SCAN_EXHAUSTED_CODE,
      message: MEMBERSHIP_REQUIRED_MESSAGE,
    };
  }

  return {
    ok: false,
    code: SUBSCRIPTION_REQUIRED_CODE,
    message: MEMBERSHIP_REQUIRED_MESSAGE,
  };
}

export async function assertOwnerFeature(
  ownerUserId: string,
  feature: FeatureFlag,
  options?: FeatureGateOptions,
): Promise<{ ok: true } | FeatureDenied> {
  if (await ownerHasFeature(ownerUserId, feature)) {
    return { ok: true };
  }

  if (
    options?.allowFreeInvoiceScan &&
    (feature === FEATURE.SCAN_AI_RECEIPT ||
      feature === FEATURE.DOCUMENT_VAULT) &&
    (await ownerCanUseAiInvoiceScan(ownerUserId))
  ) {
    return { ok: true };
  }

  if (
    options?.allowFreeAbeScan &&
    (feature === FEATURE.SCAN_AI_RECEIPT ||
      feature === FEATURE.DOCUMENT_VAULT) &&
    (await ownerCanUseAiAbeScan(ownerUserId))
  ) {
    return { ok: true };
  }

  return denyOwnerFeature(ownerUserId, options);
}

/**
 * Owner: normal Pro feature gate.
 * Schrauber: may upload when the vehicle owner has Pro (invite + vault bundle).
 */
export async function assertVehicleDocumentWrite(
  writeAccess: VehicleWriteAccess,
  feature: FeatureFlag,
  options?: FeatureGateOptions,
): Promise<{ ok: true } | FeatureDenied> {
  if (!writeAccess.ok || !writeAccess.ownerUserId) {
    return {
      ok: false,
      code: SUBSCRIPTION_REQUIRED_CODE,
      message: writeAccessErrorMessage(writeAccess),
    };
  }

  if (writeAccess.isOwner) {
    return assertOwnerFeature(writeAccess.ownerUserId, feature, options);
  }

  if (writeAccess.isContributor) {
    const invite = await assertOwnerFeature(
      writeAccess.ownerUserId,
      FEATURE.INVITE_SCHRAUBER,
    );
    if (!invite.ok) return invite;

    if (
      (options?.allowFreeInvoiceScan || options?.allowFreeAbeScan) &&
      (feature === FEATURE.SCAN_AI_RECEIPT ||
        feature === FEATURE.DOCUMENT_VAULT)
    ) {
      return assertOwnerFeature(writeAccess.ownerUserId, feature, options);
    }

    return assertOwnerFeature(writeAccess.ownerUserId, feature);
  }

  return {
    ok: false,
    code: SUBSCRIPTION_REQUIRED_CODE,
    message: writeAccessErrorMessage(writeAccess),
  };
}

export { FEATURE };
