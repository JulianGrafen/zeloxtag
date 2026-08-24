import type { VehicleWriteAccess } from "@/lib/auth/vehicle-write-access";
import { writeAccessErrorMessage } from "@/lib/auth/vehicle-write-access";
import { userHasActiveMembership } from "@/lib/billing/membership-store";
import { MEMBERSHIP_REQUIRED_MESSAGE } from "@/lib/billing/pro-plan";
import {
  FEATURE,
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
  code: typeof SUBSCRIPTION_REQUIRED_CODE;
  message: string;
};

export async function assertOwnerFeature(
  ownerUserId: string,
  feature: FeatureFlag,
): Promise<{ ok: true } | FeatureDenied> {
  if (await ownerHasFeature(ownerUserId, feature)) {
    return { ok: true };
  }
  return {
    ok: false,
    code: SUBSCRIPTION_REQUIRED_CODE,
    message: MEMBERSHIP_REQUIRED_MESSAGE,
  };
}

/**
 * Owner: normal Pro feature gate.
 * Schrauber: may upload when the vehicle owner has Pro (invite + vault bundle).
 */
export async function assertVehicleDocumentWrite(
  writeAccess: VehicleWriteAccess,
  feature: FeatureFlag,
): Promise<{ ok: true } | FeatureDenied> {
  if (!writeAccess.ok || !writeAccess.ownerUserId) {
    return {
      ok: false,
      code: SUBSCRIPTION_REQUIRED_CODE,
      message: writeAccessErrorMessage(writeAccess),
    };
  }

  if (writeAccess.isOwner) {
    return assertOwnerFeature(writeAccess.ownerUserId, feature);
  }

  if (writeAccess.isContributor) {
    return assertOwnerFeature(writeAccess.ownerUserId, FEATURE.INVITE_SCHRAUBER);
  }

  return {
    ok: false,
    code: SUBSCRIPTION_REQUIRED_CODE,
    message: writeAccessErrorMessage(writeAccess),
  };
}

export { FEATURE };
