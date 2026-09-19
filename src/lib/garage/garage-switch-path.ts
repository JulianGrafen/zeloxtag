/**
 * Preserves the sub-path when switching between owned tag dashboards.
 * Example: `/v/old/dokumente?type=abe` → `/v/new/dokumente?type=abe`
 */
export function garageSwitchPath(
  pathname: string,
  search: string,
  currentTagUuid: string,
  nextTagUuid: string,
): string {
  const fromPrefix = `/v/${currentTagUuid}`;
  const base =
    pathname.startsWith(fromPrefix)
      ? `/v/${nextTagUuid}${pathname.slice(fromPrefix.length)}`
      : `/v/${nextTagUuid}`;
  return search ? `${base}${search.startsWith("?") ? search : `?${search}`}` : base;
}
