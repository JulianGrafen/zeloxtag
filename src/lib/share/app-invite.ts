import { PRODUCTION_SITE_URL } from "@/lib/constants/public-site-url";

export const APP_INVITE_UTM_SOURCE = "friend_invite";

export function buildAppInviteRegisterUrl(siteOrigin = PRODUCTION_SITE_URL): string {
  const url = new URL("/register", siteOrigin);
  url.searchParams.set("utm_source", APP_INVITE_UTM_SOURCE);
  url.searchParams.set("utm_medium", "share");
  return url.toString();
}

export function resolveAppInviteRegisterUrlForClient(): string {
  if (typeof window === "undefined") {
    return buildAppInviteRegisterUrl();
  }
  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return buildAppInviteRegisterUrl(origin);
  }
  return buildAppInviteRegisterUrl(PRODUCTION_SITE_URL);
}

export type AppInviteSharePayload = {
  url: string;
  title: string;
  text: string;
};

const INVITE_TITLE = "ZeloxTag — digitale Garage";
const INVITE_TEXT =
  "Swipe durch Builds, dokumentiere Umbauten und TÜV — hol dir die kostenlose ZeloxTag Garage:";

export function buildAppInviteSharePayload(
  siteOrigin = PRODUCTION_SITE_URL,
): AppInviteSharePayload {
  return {
    url: buildAppInviteRegisterUrl(siteOrigin),
    title: INVITE_TITLE,
    text: INVITE_TEXT,
  };
}

export function buildAppInviteSharePayloadForClient(): AppInviteSharePayload {
  return {
    url: resolveAppInviteRegisterUrlForClient(),
    title: INVITE_TITLE,
    text: INVITE_TEXT,
  };
}
