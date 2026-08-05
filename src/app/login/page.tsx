import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Anmelden · ZeloxTag",
  description: "Sicher bei ZeloxTag anmelden (Passwort, MFA).",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string; recovered?: string }>;
}

/** Legacy `/login` → canonical home login, keeping query params. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error, recovered } = await searchParams;
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (error) params.set("error", error);
  if (recovered) params.set("recovered", recovered);
  const qs = params.toString();
  redirect(qs ? `/?${qs}` : "/");
}
