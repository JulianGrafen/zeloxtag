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

export { FEATURE };
