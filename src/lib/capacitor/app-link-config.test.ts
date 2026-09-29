import { describe, expect, it } from "vitest";

import {
  buildAndroidAssetLinks,
  buildAppleAppSiteAssociation,
  CAPACITOR_APP_ID,
  parseAndroidSha256Fingerprints,
  resolveCapacitorDeepLinkPath,
} from "./app-link-config";

const SAMPLE_SHA =
  "14:6D:E9:83:C5:73:06:50:D8:EE:B9:93:2F:B1:24:03:2A:ED:FB:AE:B0:C6:DD:98:20:9F:34:7E:15:03:B1:A0".replace(
    /:/g,
    "",
  );

describe("buildAppleAppSiteAssociation", () => {
  it("embeds team id and bundle id", () => {
    const aasa = buildAppleAppSiteAssociation("ABCDE12345");
    expect(aasa.applinks.details[0]?.appID).toBe(
      `ABCDE12345.${CAPACITOR_APP_ID}`,
    );
    expect(aasa.applinks.details[0]?.paths).toContain("/v/*");
  });

  it("rejects empty team id", () => {
    expect(() => buildAppleAppSiteAssociation("")).toThrow(/APPLE_TEAM_ID/);
  });
});

describe("buildAndroidAssetLinks", () => {
  it("builds delegate statement", () => {
    const links = buildAndroidAssetLinks([SAMPLE_SHA]);
    expect(links[0]?.target.package_name).toBe(CAPACITOR_APP_ID);
    expect(links[0]?.target.sha256_cert_fingerprints).toEqual([SAMPLE_SHA]);
  });
});

describe("parseAndroidSha256Fingerprints", () => {
  it("normalizes colon-separated fingerprints", () => {
    const parsed = parseAndroidSha256Fingerprints(
      "14:6D:E9:83:C5:73:06:50:D8:EE:B9:93:2F:B1:24:03:2A:ED:FB:AE:B0:C6:DD:98:20:9F:34:7E:15:03:B1:A0",
    );
    expect(parsed).toEqual([SAMPLE_SHA]);
  });
});

describe("resolveCapacitorDeepLinkPath", () => {
  it("returns in-app path for production host", () => {
    expect(
      resolveCapacitorDeepLinkPath(
        "https://app.zeloxtag.de/v/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?scan=1",
      ),
    ).toBe(
      "/v/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa?scan=1",
    );
  });

  it("rejects foreign hosts", () => {
    expect(resolveCapacitorDeepLinkPath("https://evil.example/v/x")).toBeNull();
  });
});
