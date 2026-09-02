import { describe, expect, it } from "vitest";

import {
  FEATURE,
  FREE_DASHBOARD_TILE_IDS,
  featureForDashboardTile,
  hasFeatureAccess,
  isProOnlyFeature,
  resolveUserTier,
} from "@/lib/permissions/feature-access";

describe("resolveUserTier", () => {
  it("defaults to free when there is no active membership", () => {
    expect(resolveUserTier(false)).toBe("free");
    expect(resolveUserTier(true)).toBe("pro");
  });
});

describe("hasFeatureAccess", () => {
  it("lets free users claim a tag and edit the basic profile", () => {
    expect(hasFeatureAccess("free", FEATURE.CLAIM_TAG)).toBe(true);
    expect(hasFeatureAccess("free", FEATURE.EDIT_BASIC_PROFILE)).toBe(true);
    expect(hasFeatureAccess("free", FEATURE.VIEW_PUBLIC_PROFILE)).toBe(true);
    expect(hasFeatureAccess("free", FEATURE.ADD_MANUAL_SERVICE_ENTRY)).toBe(true);
  });

  it("keeps AI scan and vault writes on Pro", () => {
    expect(hasFeatureAccess("free", FEATURE.SCAN_AI_RECEIPT)).toBe(false);
    expect(hasFeatureAccess("free", FEATURE.DOCUMENT_VAULT)).toBe(false);
    expect(hasFeatureAccess("free", FEATURE.VIEW_DOCUMENT_VAULT)).toBe(true);
    expect(hasFeatureAccess("free", FEATURE.GENERATE_EXPOSE)).toBe(false);
    expect(hasFeatureAccess("free", FEATURE.INVITE_SCHRAUBER)).toBe(false);

    expect(hasFeatureAccess("pro", FEATURE.SCAN_AI_RECEIPT)).toBe(true);
    expect(hasFeatureAccess("pro", FEATURE.DOCUMENT_VAULT)).toBe(true);
    expect(hasFeatureAccess("pro", FEATURE.VIEW_DOCUMENT_VAULT)).toBe(true);
    expect(hasFeatureAccess("pro", FEATURE.GENERATE_EXPOSE)).toBe(true);
  });
});

describe("dashboard tile mapping", () => {
  it("treats specs and public profile as free", () => {
    expect(FREE_DASHBOARD_TILE_IDS.has("specs")).toBe(true);
    expect(FREE_DASHBOARD_TILE_IDS.has("vehicle-settings")).toBe(true);
    expect(FREE_DASHBOARD_TILE_IDS.has("settings")).toBe(true);
    expect(featureForDashboardTile("specs")).toBe(FEATURE.EDIT_BASIC_PROFILE);
    expect(isProOnlyFeature(FEATURE.EDIT_BASIC_PROFILE)).toBe(false);
    expect(isProOnlyFeature(FEATURE.CLAIM_TAG)).toBe(false);
  });

  it("maps vault tiles to free read access and scan to Pro", () => {
    expect(featureForDashboardTile("invoices")).toBe(FEATURE.VIEW_DOCUMENT_VAULT);
    expect(featureForDashboardTile("abe")).toBe(FEATURE.VIEW_DOCUMENT_VAULT);
    expect(featureForDashboardTile("service")).toBe(FEATURE.VIEW_DOCUMENT_VAULT);
    expect(featureForDashboardTile("schrauber")).toBe(FEATURE.INVITE_SCHRAUBER);
    expect(isProOnlyFeature(FEATURE.VIEW_DOCUMENT_VAULT)).toBe(false);
    expect(isProOnlyFeature(FEATURE.SCAN_AI_RECEIPT)).toBe(true);
    expect(isProOnlyFeature(FEATURE.DOCUMENT_VAULT)).toBe(true);
  });

  it("keeps manual service history tiles on the free tier", () => {
    expect(featureForDashboardTile("oil-change")).toBe(
      FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    );
    expect(featureForDashboardTile("tuning-history")).toBe(
      FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    );
    expect(featureForDashboardTile("timeline")).toBe(
      FEATURE.ADD_MANUAL_SERVICE_ENTRY,
    );
    expect(isProOnlyFeature(FEATURE.ADD_MANUAL_SERVICE_ENTRY)).toBe(false);
  });
});
