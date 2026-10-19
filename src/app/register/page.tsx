import { redirect } from "next/navigation";

type RegisterRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy PWA URL — garage signup lives on home (Registrieren tab). */
export default async function RegisterRedirectPage({
  searchParams,
}: RegisterRedirectPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  query.set("tab", "signup");

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || key === "tab") continue;
    query.set(key, Array.isArray(value) ? value[0]! : value);
  }

  redirect(`/?${query.toString()}`);
}
