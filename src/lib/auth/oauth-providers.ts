export const OAUTH_PROVIDERS = ["google", "apple"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export function oauthProviderLabel(provider: OAuthProvider): string {
  switch (provider) {
    case "google":
      return "Google";
    case "apple":
      return "Apple";
  }
}

export function oauthStartPath(
  provider: OAuthProvider,
  nextPath: string,
): string {
  const params = new URLSearchParams({ next: nextPath });
  return `/auth/oauth/${provider}?${params.toString()}`;
}
