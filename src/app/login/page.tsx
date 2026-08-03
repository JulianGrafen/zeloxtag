import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Anmelden · ZeloxTag",
  description: "Per Magic Link bei ZeloxTag anmelden.",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;

  return (
    <AppShell>
      <LoginForm nextPath={next ?? "/"} initialError={error} />
    </AppShell>
  );
}
