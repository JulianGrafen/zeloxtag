import { resolveApiUrl } from "@/lib/api/resolve-api-base-url";

/**
 * Fetch against the ZeloxTag backend. Uses `NEXT_PUBLIC_API_BASE_URL` in native
 * shells; relative paths on web.
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = resolveApiUrl(path);
  return fetch(url, {
    ...init,
    credentials: init?.credentials ?? "include",
  });
}
