import { redirect } from "next/navigation";

interface ManualEntryPageProps {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** @deprecated Use `/umbauten` — kept for bookmarks and old links. */
export default async function ManualEntryPage({
  params,
  searchParams,
}: ManualEntryPageProps) {
  const { uuid } = await params;
  const query = await searchParams;
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => next.append(key, entry));
    } else {
      next.set(key, value);
    }
  }
  const suffix = next.toString() ? `?${next.toString()}` : "";
  redirect(`/v/${uuid}/umbauten${suffix}`);
}
